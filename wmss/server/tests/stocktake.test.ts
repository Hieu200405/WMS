import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { UserModel } from '../src/models/user.model.js';
import { ProductModel } from '../src/models/product.model.js';
import { InventoryModel } from '../src/models/inventory.model.js';
import { WarehouseNodeModel } from '../src/models/warehouseNode.model.js';
import { StocktakeModel } from '../src/models/stocktake.model.js';
import { env } from '../src/config/env.js';

describe('Stocktake API', () => {
    const app = createApp();
    let token: string;
    let managerId: string;
    let productId: string;
    let locationId: string;

    beforeEach(async () => {
        try {
            // Setup User (Manager)
            const passwordHash = await bcrypt.hash('Manager123!', env.saltRounds);
            const manager = await UserModel.create({
                email: 'manager@test.com',
                passwordHash,
                fullName: 'Manager User',
                role: 'Manager'
            });
            managerId = manager.id;
            const login = await request(app).post('/api/v1/auth/login').send({
                email: 'manager@test.com',
                password: 'Manager123!'
            });
            token = login.body.data.accessToken;

            // Setup Data
            // Category
            const { CategoryModel } = await import('../src/models/category.model.js');
            const category = await CategoryModel.create({ name: 'Stocktake Cat', code: 'CAT-ST' });

            // Warehouse & Location
            const warehouse = await WarehouseNodeModel.create({ type: 'warehouse', name: 'ST WH', code: 'WH-ST', warehouseType: 'General' });
            const bin = await WarehouseNodeModel.create({
                type: 'bin', name: 'Bin ST', code: 'B-ST', parentId: warehouse._id
            });
            locationId = bin.id;

            // Partner (for financial transaction)
            const { PartnerModel } = await import('../src/models/partner.model.js');
            await PartnerModel.create({
                name: 'System',
                type: 'supplier',
                code: 'INTERNAL',
                contact: 'sys@test.com - 0000000000'
            });

            // Product
            const product = await ProductModel.create({
                sku: 'ST-001',
                name: 'Stocktake Item',
                categoryId: category._id,
                priceIn: 50,
                priceOut: 100,
                unit: 'pcs',
                minStock: 5
            });
            productId = product.id;

            // Initial Inventory: 10
            await InventoryModel.create({
                productId,
                locationId,
                quantity: 10,
                status: 'available'
            });
        } catch (e) {
            console.error('Setup failed:', e);
        }
    });

    it('should create a stocktake draft', async () => {
        const res = await request(app)
            .post('/api/v1/stocktakes')
            .set('Authorization', `Bearer ${token}`)
            .send({
                code: 'ST-TEST-001',
                date: new Date().toISOString(),
                items: [{
                    productId,
                    locationId,
                    countedQty: 8 // Discrepancy: -2
                }]
            });

        expect(res.status).toBe(201);
        expect(res.body.data.status).toBe('draft');
        expect(res.body.data.items[0].systemQty).toBe(10);
        expect(res.body.data.items[0].countedQty).toBe(8);
    });

    it('should approve stocktake and create adjustment', async () => {
        // 1. Create Draft
        const stocktake = await StocktakeModel.create({
            code: 'ST-TEST-002',
            date: new Date(),
            status: 'draft',
            items: [{
                productId,
                locationId,
                systemQty: 10,
                countedQty: 12 // Discrepancy: +2
            }]
        });

        // 2. Approve
        const res = await request(app)
            .post(`/api/v1/stocktakes/${stocktake.id}/approve`)
            .set('Authorization', `Bearer ${token}`)
            .send({ minutes: 'Approved via test' });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('approved');
        expect(res.body.data.adjustmentId).toBeDefined();
    });

    it('should apply stocktake and update inventory', async () => {
        // 1. Create Draft & Approve (mock flow by DB insertion)
        // Need to create adjustment first as per logic? 
        // Logic: approveStocktake creates Adjustment. applyStocktake applies Adjustment.

        // Let's use the API flow to be safe and integration-like
        // A. Create
        const createRes = await request(app)
            .post('/api/v1/stocktakes')
            .set('Authorization', `Bearer ${token}`)
            .send({
                code: 'ST-TEST-003-' + Date.now(),
                date: new Date().toISOString(),
                items: [{ productId, locationId, countedQty: 15 }] // +5
            });
        const stId = createRes.body.data._id;

        // B. Approve
        const approveRes = await request(app)
            .post(`/api/v1/stocktakes/${stId}/approve`)
            .set('Authorization', `Bearer ${token}`);
        if (approveRes.status !== 200) {
            console.error('Approve failed:', JSON.stringify(approveRes.body, null, 2));
        }
        expect(approveRes.status).toBe(200);

        // C. Apply
        const applyRes = await request(app)
            .post(`/api/v1/stocktakes/${stId}/apply`)
            .set('Authorization', `Bearer ${token}`);

        if (applyRes.status !== 200) {
            console.error('Apply failed:', JSON.stringify(applyRes.body, null, 2));
        }
        expect(applyRes.status).toBe(200);
        expect(applyRes.body.data.status).toBe('applied');

        // Check Inventory
        const inv = await InventoryModel.findOne({ productId, locationId });
        expect(inv?.quantity).toBe(15);
    });

    it('should prevent non-managers from approving', async () => {
        // Create Staff User
        const staff = await UserModel.create({
            email: 'staff@test.com',
            passwordHash: 'hash',
            fullName: 'Staff',
            role: 'Staff'
        });
        const login = await request(app).post('/api/v1/auth/login').send({
            email: 'staff@test.com',
            password: 'Manager123!' // Using same password hash from setup would be easier but let's re-hash or just reuse logic
        });
        // Wait, I cannot login with "Manager123!" if I put "hash". 
        // Need real hash.

        // Re-use logic:
        const passwordHash = await bcrypt.hash('Staff123!', 10);
        await UserModel.findOneAndUpdate({ email: 'staff@test.com' }, { passwordHash });

        const staffLogin = await request(app).post('/api/v1/auth/login').send({
            email: 'staff@test.com',
            password: 'Staff123!'
        });
        const staffToken = staffLogin.body.data.accessToken;

        // Create Draft
        const stocktake = await StocktakeModel.create({
            code: 'ST-TEST-004',
            date: new Date(),
            status: 'draft',
            items: []
        });

        // Attempt Approve
        const res = await request(app)
            .post(`/api/v1/stocktakes/${stocktake.id}/approve`)
            .set('Authorization', `Bearer ${staffToken}`);

        expect(res.status).toBe(403);
    });
});
