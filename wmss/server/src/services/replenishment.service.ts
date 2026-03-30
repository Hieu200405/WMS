import { Types } from 'mongoose';
import { ProductModel } from '../models/product.model.js';
import { InventoryModel } from '../models/inventory.model.js';
import { createReceipt } from './receipt.service.js';

interface ReplenishmentSuggestion {
    supplierId: string;
    supplierName: string; // Populated for UI
    lines: {
        productId: string;
        sku: string;
        name: string;
        currentStock: number;
        minStock: number;
        suggestedQty: number; // Target level - Current
        priceIn: number;
    }[];
}

export const getReplenishmentSuggestions = async (): Promise<ReplenishmentSuggestion[]> => {
    // 1. Get all products with minStock defined
    const products = await ProductModel.find({ minStock: { $gt: 0 } }).populate('supplierIds', 'name').lean();

    // 2. Get current global stock for these products
    const inventory = await InventoryModel.aggregate([
        { $group: { _id: '$productId', total: { $sum: '$quantity' } } }
    ]);
    const stockMap = new Map<string, number>();
    inventory.forEach(i => stockMap.set(i._id.toString(), i.total));

    // 3. Filter low stock products
    const lowStockProducts = products.filter(p => {
        const current = stockMap.get(p._id.toString()) || 0;
        return current < p.minStock;
    });

    if (lowStockProducts.length === 0) return [];

    // 4. Group by Supplier
    const suggestionsMap = new Map<string, ReplenishmentSuggestion>();

    for (const p of lowStockProducts) {
        // Simple logic: Pick first supplier. If none, invalid for auto-replenishment.
        if (!p.supplierIds || p.supplierIds.length === 0) continue;

        const supplier = p.supplierIds[0] as any; // Type assertion since populated
        const supplierId = supplier._id.toString();

        const current = stockMap.get(p._id.toString()) || 0;
        // Target Stock = minStock * 3 (Safety stock logic)
        // Order Qty = Target - Current
        let suggestedQty = (p.minStock * 3) - current;
        if (suggestedQty < 1) suggestedQty = 1;

        if (!suggestionsMap.has(supplierId)) {
            suggestionsMap.set(supplierId, {
                supplierId,
                supplierName: supplier.name,
                lines: []
            });
        }

        suggestionsMap.get(supplierId)!.lines.push({
            productId: p._id.toString(),
            sku: p.sku,
            name: p.name,
            currentStock: current,
            minStock: p.minStock,
            suggestedQty,
            priceIn: p.priceIn
        });
    }

    return Array.from(suggestionsMap.values());
};

export const createReplenishmentOrders = async (
    suggestions: ReplenishmentSuggestion[],
    actorId: string
) => {
    const createdReceipts = [];

    for (const order of suggestions) {
        // Generate a unique code
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomAuth = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const code = `PN-AUTO-${dateStr}-${randomAuth}`; // Example: PN-AUTO-20231027-123

        try {
            const receipt = await createReceipt({
                code,
                supplierId: order.supplierId,
                date: new Date(),
                lines: order.lines.map(l => ({
                    productId: l.productId,
                    qty: l.suggestedQty,
                    priceIn: l.priceIn
                })),
                notes: 'Tự động tạo bởi hệ thống bổ sung hàng (Auto-Replenishment)',
                attachments: []
            }, actorId);
            createdReceipts.push(receipt);
        } catch (error) {
            console.error(`Failed to create auto receipt for supplier ${order.supplierId}`, error);
        }
    }
    return createdReceipts;
};
