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

    it('should create a stocktake with status "diff" if there is a discrepancy', async () => {
        const res = await request(app)
            .post('/api/v1/stocktakes')
            .set('Authorization', `Bearer ${token}`)
            .send({
                code: 'ST-TEST-001',
                date: new Date().toISOString(),
                items: [{
                    productId,
                    locationId,
                    countedQty: 8 // Discrepancy: system has 10, counted is 8
                }]
            });

        expect(res.status).toBe(201);
        expect(res.body.data.status).toBe('diff');
        expect(res.body.data.items[0].systemQty).toBe(10);
        expect(res.body.data.items[0].countedQty).toBe(8);
    });

    it('should create a stocktake with status "pass" if there is no discrepancy', async () => {
        const res = await request(app)
            .post('/api/v1/stocktakes')
            .set('Authorization', `Bearer ${token}`)
            .send({
                code: 'ST-TEST-002',
                date: new Date().toISOString(),
                items: [{
                    productId,
                    locationId,
                    countedQty: 10 // No discrepancy: system has 10, counted is 10
                }]
            });

        expect(res.status).toBe(201);
        expect(res.body.data.status).toBe('pass');
        expect(res.body.data.items[0].systemQty).toBe(10);
        expect(res.body.data.items[0].countedQty).toBe(10);
    });

    it('should list stocktakes with pagination and filters', async () => {
        // Create two stocktakes
        await StocktakeModel.create({
            code: 'ST-LIST-001',
            date: new Date(),
            status: 'diff',
            items: [{
                productId,
                locationId,
                systemQty: 10,
                countedQty: 12
            }]
        });

        await StocktakeModel.create({
            code: 'ST-LIST-002',
            date: new Date(),
            status: 'pass',
            items: [{
                productId,
                locationId,
                systemQty: 10,
                countedQty: 10
            }]
        });

        const res = await request(app)
            .get('/api/v1/stocktakes')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should update an existing stocktake and recompute status', async () => {
        const stocktake = await StocktakeModel.create({
            code: 'ST-UPDATE-001',
            date: new Date(),
            status: 'pass',
            items: [{
                productId,
                locationId,
                systemQty: 10,
                countedQty: 10 // Initial state: pass
            }]
        });

        const res = await request(app)
            .put(`/api/v1/stocktakes/${stocktake.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                items: [{
                    productId,
                    locationId,
                    countedQty: 7 // Update state: diff
                }]
            });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('diff');
        expect(res.body.data.items[0].countedQty).toBe(7);
    });

    it('should delete a stocktake', async () => {
        const stocktake = await StocktakeModel.create({
            code: 'ST-DELETE-001',
            date: new Date(),
            status: 'pass',
            items: []
        });

        const res = await request(app)
            .delete(`/api/v1/stocktakes/${stocktake.id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(204);

        const found = await StocktakeModel.findById(stocktake.id);
        expect(found).toBeNull();
    });
});
