import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { UserModel } from '../src/models/user.model.js';
import { CategoryModel } from '../src/models/category.model.js';
import { ProductModel } from '../src/models/product.model.js';
import { WarehouseNodeModel } from '../src/models/warehouseNode.model.js';
import { InventoryModel } from '../src/models/inventory.model.js';
import { env } from '../src/config/env.js';
import { pickInventoryFIFO, applyFIFOPicks } from '../src/services/fifo.service.js';

describe('FIFO Service Strategy', () => {
    const app = createApp();
    let productId: string;
    let whId: string;

    beforeEach(async () => {
        try {
            // Setup Product
            const category = await CategoryModel.create({ name: 'FIFO Test', code: 'CAT-FIFO-' + Date.now() });
            const product = await ProductModel.create({
                sku: 'FIFO-' + Date.now(),
                name: 'FIFO Item',
                categoryId: category._id,
                unit: 'pcs',
                priceIn: 10,
                priceOut: 20,
                minStock: 0
            });
            productId = product.id;

            const warehouse = await WarehouseNodeModel.create({ type: 'warehouse', name: 'WH', code: 'WH-F-' + Date.now() });
            whId = warehouse.id;
        } catch (error) {
            console.error('Setup failed:', error);
            throw error;
        }
    });

    it('should pick oldest expiring items first (FEFO)', async () => {
        // Setup Inventory:
        // Batch A: Expire 2026-01-01 (Oldest), Qty 20
        // Batch B: Expire 2026-06-01 (Mid), Qty 30
        // Batch C: Expire 2026-12-31 (Newest), Qty 50

        await InventoryModel.create([
            {
                productId,
                locationId: whId,
                quantity: 20,
                batch: 'BATCH-A',
                expDate: new Date('2026-01-01'),
                status: 'available'
            },
            {
                productId,
                locationId: whId,
                quantity: 30,
                batch: 'BATCH-B',
                expDate: new Date('2026-06-01'),
                status: 'available'
            },
            {
                productId,
                locationId: whId,
                quantity: 50,
                batch: 'BATCH-C',
                expDate: new Date('2026-12-31'),
                status: 'available'
            }
        ]);

        // Scenario: Demand 60
        // Expect: 20 (A) + 30 (B) + 10 (C)
        const result = await pickInventoryFIFO({
            productId,
            quantity: 60
        });

        expect(result.totalPicked).toBe(60);
        expect(result.picks).toHaveLength(3);

        expect(result.picks[0].batch).toBe('BATCH-A');
        expect(result.picks[0].quantity).toBe(20);

        expect(result.picks[1].batch).toBe('BATCH-B');
        expect(result.picks[1].quantity).toBe(30);

        expect(result.picks[2].batch).toBe('BATCH-C');
        expect(result.picks[2].quantity).toBe(10);
    });

    it('should fail if insufficient stock', async () => {
        await InventoryModel.create({
            productId,
            locationId: whId,
            quantity: 10,
            status: 'available'
        });

        await expect(pickInventoryFIFO({
            productId,
            quantity: 20
        })).rejects.toThrow();
    });

    it('should apply picks correctly to reduce inventory', async () => {
        const item = await InventoryModel.create({
            productId,
            locationId: whId,
            quantity: 50,
            batch: 'APPLY-TEST',
            status: 'available'
        });

        const picks = [{
            inventoryId: item.id,
            locationId: whId,
            quantity: 20
        }];

        await applyFIFOPicks(picks);

        const updated = await InventoryModel.findById(item._id);
        expect(updated?.quantity).toBe(30);
    });
});
