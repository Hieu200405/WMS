import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { UserModel } from '../src/models/user.model.js';
import { CategoryModel } from '../src/models/category.model.js';
import { ProductModel } from '../src/models/product.model.js';
import { WarehouseNodeModel } from '../src/models/warehouseNode.model.js';
import { InventoryModel } from '../src/models/inventory.model.js';
import { env } from '../src/config/env.js';
import { moveInventory, adjustInventory } from '../src/services/inventory.service.js';

describe('Inventory Service & API', () => {
    const app = createApp();
    let token: string;
    let productId: string;
    let binAId: string;
    let binBId: string;

    beforeEach(async () => {
        try {
            // Setup User
            const passwordHash = await bcrypt.hash('Admin123!', env.saltRounds);
            await UserModel.create({
                email: 'admin@test.com',
                passwordHash,
                fullName: 'Admin User',
                role: 'Admin'
            });
            const login = await request(app).post('/api/v1/auth/login').send({
                email: 'admin@test.com',
                password: 'Admin123!'
            });
            token = login.body.data.accessToken;

            // Setup Product
            const category = await CategoryModel.create({ name: 'Inventory Test', code: 'CAT-INV' });
            const product = await ProductModel.create({
                sku: 'INV-001',
                name: 'Inventory Item',
                categoryId: category._id,
                unit: 'pcs',
                priceIn: 10,
                priceOut: 20,
                minStock: 0
            });
            productId = product.id;

            // Setup Warehouse Nodes
            const warehouse = await WarehouseNodeModel.create({ type: 'warehouse', name: 'Main WH', code: 'WH-01' });
            const binA = await WarehouseNodeModel.create({ type: 'bin', name: 'Bin A', code: 'BIN-A', parentId: warehouse._id });
            const binB = await WarehouseNodeModel.create({ type: 'bin', name: 'Bin B', code: 'BIN-B', parentId: warehouse._id });
            binAId = binA.id;
            binBId = binB.id;
        } catch (error) {
            console.error('Setup failed:', error);
            throw error;
        }
    });

    it('should adjust inventory correctly', async () => {
        // Increase stock via service
        await adjustInventory(productId, binAId, 50);

        const stockA = await InventoryModel.findOne({ productId, locationId: binAId });
        expect(stockA?.quantity).toBe(50);

        // Decrease stock
        await adjustInventory(productId, binAId, -20);
        const stockA2 = await InventoryModel.findOne({ productId, locationId: binAId });
        expect(stockA2?.quantity).toBe(30);

        // Fail on insufficient stock
        await expect(adjustInventory(productId, binAId, -100)).rejects.toThrow('Insufficient stock');
    });

    it('should move inventory between locations', async () => {
        // Setup initial stock
        await adjustInventory(productId, binAId, 50);

        // Move 20 to Bin B
        await moveInventory({
            productId,
            fromLocation: binAId,
            toLocation: binBId,
            qty: 20
        });

        const stockA = await InventoryModel.findOne({ productId, locationId: binAId });
        const stockB = await InventoryModel.findOne({ productId, locationId: binBId });

        expect(stockA?.quantity).toBe(30);
        expect(stockB?.quantity).toBe(20);
    });

    it('should prevent moving negative quantity', async () => {
        await adjustInventory(productId, binAId, 50);
        await expect(moveInventory({
            productId,
            fromLocation: binAId,
            toLocation: binBId,
            qty: -10
        })).rejects.toThrow();
    });

    it('should fail if source location does not have product', async () => {
        await expect(moveInventory({
            productId,
            fromLocation: binBId, // Empty
            toLocation: binAId,
            qty: 10
        })).rejects.toThrow('Insufficient stock');
    });

    it('should list inventory via API', async () => {
        await adjustInventory(productId, binAId, 100);

        const res = await request(app)
            .get('/api/v1/inventory')
            .set('Authorization', `Bearer ${token}`)
            .query({ locationId: binAId });

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].quantity).toBe(100);
        expect(res.body.data[0].locationId).toBe(binAId);
    });

    // Concurrency Test
    it('should handle concurrent moves safely (prevention of double spending)', async () => {
        await adjustInventory(productId, binAId, 100);

        // Try to move 80 units twice simultaneously. Total needed 160, available 100.
        // One should succeed, one should fail.
        const movePromise1 = moveInventory({
            productId,
            fromLocation: binAId,
            toLocation: binBId,
            qty: 80
        });

        const movePromise2 = moveInventory({
            productId,
            fromLocation: binAId,
            toLocation: binBId,
            qty: 80
        });

        const results = await Promise.allSettled([movePromise1, movePromise2]);
        const fulfilled = results.filter(r => r.status === 'fulfilled');
        const rejected = results.filter(r => r.status === 'rejected');

        expect(fulfilled.length).toBe(1);
        expect(rejected.length).toBe(1);

        const stockA = await InventoryModel.findOne({ productId, locationId: binAId });
        const stockB = await InventoryModel.findOne({ productId, locationId: binBId });

        expect(stockA?.quantity).toBe(20); // 100 - 80
        expect(stockB?.quantity).toBe(80); // 0 + 80
    });
});
