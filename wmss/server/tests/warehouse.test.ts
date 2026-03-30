import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { UserModel } from '../src/models/user.model.js';
import { WarehouseNodeModel } from '../src/models/warehouseNode.model.js';
import { env } from '../src/config/env.js';
import { createWarehouseNode } from '../src/services/warehouse.service.js';

describe('Warehouse Service & API', () => {
    const app = createApp();
    let token: string;
    let adminId: string;

    beforeEach(async () => {
        const passwordHash = await bcrypt.hash('Admin123!', env.saltRounds);
        const admin = await UserModel.create({
            email: 'admin@test.com',
            passwordHash,
            fullName: 'Admin User',
            role: 'Admin'
        });
        adminId = admin.id;

        const login = await request(app).post('/api/v1/auth/login').send({
            email: 'admin@test.com',
            password: 'Admin123!'
        });
        token = login.body.data.accessToken;
    });

    it('should create warehouse hierarchy correctly', async () => {
        // 1. Create Warehouse
        const warehouse = await createWarehouseNode({
            type: 'warehouse',
            name: 'Main WH',
            code: 'WH-01',
            warehouseType: 'General'
        }, adminId);
        expect(warehouse).toBeDefined();

        // 2. Create Zone (Child of Warehouse)
        const zone = await createWarehouseNode({
            type: 'zone',
            name: 'Zone A',
            code: 'ZONE-A',
            parentId: (warehouse as any)._id.toString()
        }, adminId);
        expect((zone as any).parentId.toString()).toBe((warehouse as any)._id.toString());

        // 3. Create Aisle (Child of Zone)
        const aisle = await createWarehouseNode({
            type: 'aisle',
            name: 'Aisle 1',
            code: 'A-1',
            parentId: (zone as any)._id.toString()
        }, adminId);

        // 4. Create Rack
        const rack = await createWarehouseNode({
            type: 'rack',
            name: 'Rack 1',
            code: 'R-1',
            parentId: (aisle as any)._id.toString()
        }, adminId);

        // 5. Create Bin
        const bin = await createWarehouseNode({
            type: 'bin',
            name: 'Bin 1',
            code: 'B-1',
            parentId: (rack as any)._id.toString()
        }, adminId);
        expect(bin).toBeDefined();
    });

    it('should enforce strict hierarchy', async () => {
        const warehouse = await createWarehouseNode({
            type: 'warehouse',
            name: 'Main WH 2',
            code: 'WH-02',
            warehouseType: 'General'
        }, adminId);

        // Try to create Bin as child of Warehouse (Skip Zone, Aisle, Rack)
        await expect(createWarehouseNode({
            type: 'bin',
            name: 'Bad Bin',
            code: 'BAD-BIN',
            parentId: (warehouse as any)._id.toString()
        }, adminId)).rejects.toThrow('Invalid hierarchy');
    });

    it('should auto-generate barcodes', async () => {
        const warehouse = await createWarehouseNode({
            type: 'warehouse',
            name: 'Main WH 3',
            code: 'WH-03',
            warehouseType: 'General'
        }, adminId);

        const zone = await createWarehouseNode({
            type: 'zone',
            name: 'Zone C',
            code: 'Z-C',
            parentId: (warehouse as any)._id.toString()
        }, adminId);

        // parentPrefix = WH-03 -> Barcode = WH-03-Z-C
        expect((zone as any).barcode).toBe('WH-03-Z-C');
    });

    it('should list warehouse tree via API', async () => {
        // Setup simple tree
        const warehouse = await createWarehouseNode({
            type: 'warehouse',
            name: 'API WH',
            code: 'WH-API',
            warehouseType: 'General'
        }, adminId);

        const zone = await createWarehouseNode({
            type: 'zone',
            name: 'API Zone',
            code: 'Z-API',
            parentId: (warehouse as any)._id.toString()
        }, adminId);

        const res = await request(app)
            .get('/api/v1/warehouse/tree')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        // Should find the warehouse in the root list
        const found = res.body.data.find((n: any) => n.code === 'WH-API');
        expect(found).toBeDefined();
        // Should have children check
        expect(found.children.length).toBeGreaterThanOrEqual(1);
        expect(found.children[0].code).toBe('Z-API');
    });
});
