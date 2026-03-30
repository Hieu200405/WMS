import { Types } from 'mongoose';
import { InventoryModel } from '../models/inventory.model.js';
import { notFound, badRequest } from '../utils/errors.js';

/**
 * FIFO (First In First Out) Service
 * Ensures oldest inventory is picked first
 */

export interface PickRequest {
    productId: string;
    quantity: number;
    locationId?: string; // Optional: pick from specific location
}

export interface PickResult {
    productId: string;
    picks: Array<{
        inventoryId: string;
        locationId: string;
        batch?: string;
        expDate?: Date;
        quantity: number;
    }>;
    totalPicked: number;
}

/**
 * Pick inventory using FIFO logic
 * Prioritizes: 1) Expiry date (earliest first), 2) Batch (oldest first), 3) Created date
 */
export const pickInventoryFIFO = async (
    request: PickRequest
): Promise<PickResult> => {
    const { productId, quantity, locationId } = request;

    if (quantity <= 0) {
        throw badRequest('Quantity must be positive');
    }

    // Build filter
    const filter: Record<string, unknown> = {
        productId: new Types.ObjectId(productId),
        quantity: { $gt: 0 },
        status: 'available'
    };

    if (locationId) {
        filter.locationId = new Types.ObjectId(locationId);
    }

    // Find available inventory, sorted by FIFO rules
    const inventoryItems = await InventoryModel.find(filter)
        .sort({
            expDate: 1, // Earliest expiry first
            batch: 1, // Oldest batch first
            createdAt: 1 // Oldest created first
        })
        .lean();

    if (inventoryItems.length === 0) {
        throw notFound('No available inventory for this product');
    }

    // Calculate total available
    const totalAvailable = inventoryItems.reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    if (totalAvailable < quantity) {
        throw badRequest(
            `Insufficient inventory. Required: ${quantity}, Available: ${totalAvailable}`
        );
    }

    // Pick from inventory using FIFO
    const picks: PickResult['picks'] = [];
    let remaining = quantity;

    for (const item of inventoryItems) {
        if (remaining <= 0) break;

        const pickQty = Math.min(item.quantity, remaining);

        picks.push({
            inventoryId: item._id.toString(),
            locationId: item.locationId.toString(),
            batch: item.batch || undefined,
            expDate: item.expDate || undefined,
            quantity: pickQty
        });

        remaining -= pickQty;
    }

    return {
        productId,
        picks,
        totalPicked: quantity
    };
};

/**
 * Apply FIFO picks to inventory (reduce quantities)
 */
export const applyFIFOPicks = async (picks: PickResult['picks']): Promise<void> => {
    for (const pick of picks) {
        const inventory = await InventoryModel.findById(
            new Types.ObjectId(pick.inventoryId)
        );

        if (!inventory) {
            throw notFound(`Inventory ${pick.inventoryId} not found`);
        }

        inventory.quantity -= pick.quantity;

        if (inventory.quantity < 0) {
            throw badRequest('Inventory quantity cannot be negative');
        }

        await inventory.save();
    }
};

/**
 * Pick and apply in one transaction
 */
export const pickAndApplyFIFO = async (
    request: PickRequest
): Promise<PickResult> => {
    const result = await pickInventoryFIFO(request);
    await applyFIFOPicks(result.picks);
    return result;
};

/**
 * Get next batch to pick (for preview)
 */
export const getNextBatchFIFO = async (
    productId: string,
    locationId?: string
): Promise<{
    batch?: string;
    expDate?: Date;
    quantity: number;
    locationId: string;
} | null> => {
    const filter: Record<string, unknown> = {
        productId: new Types.ObjectId(productId),
        quantity: { $gt: 0 },
        status: 'available'
    };

    if (locationId) {
        filter.locationId = new Types.ObjectId(locationId);
    }

    const nextItem = await InventoryModel.findOne(filter)
        .sort({
            expDate: 1,
            batch: 1,
            createdAt: 1
        })
        .lean();

    if (!nextItem) {
        return null;
    }

    return {
        batch: nextItem.batch || undefined,
        expDate: nextItem.expDate || undefined,
        quantity: nextItem.quantity,
        locationId: nextItem.locationId.toString()
    };
};
