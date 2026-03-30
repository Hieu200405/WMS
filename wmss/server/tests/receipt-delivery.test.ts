import request from 'supertest';
import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { UserModel } from '../src/models/user.model.js';
import { CategoryModel } from '../src/models/category.model.js';
import { ProductModel } from '../src/models/product.model.js';
import { PartnerModel } from '../src/models/partner.model.js';
import { WarehouseNodeModel } from '../src/models/warehouseNode.model.js';
import { InventoryModel } from '../src/models/inventory.model.js';
import { FinancialTransactionModel } from '../src/models/transaction.model.js';
import { env } from '../src/config/env.js';

describe('Receipt & Delivery flows', () => {
  const app = createApp();
  let token: string;
  let productId: string;
  let supplierId: string;
  let customerId: string;
  let binId: string;

  beforeEach(async () => {
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

    const category = await CategoryModel.create({ name: 'General', code: 'CAT-GEN' });
    const product = await ProductModel.create({
      sku: 'SKU-100',
      name: 'Receipt Product',
      categoryId: category._id,
      unit: 'pcs',
      priceIn: 20,
      priceOut: 30,
      minStock: 10
    });
    productId = product.id;

    const supplier = await PartnerModel.create({ type: 'supplier', name: 'Supplier Seed', code: 'SUP-TEST', contact: '0900' });
    supplierId = supplier.id;
    const customer = await PartnerModel.create({ type: 'customer', name: 'Customer Seed', code: 'CUST-TEST', contact: '0901', customerType: 'Corporate' });
    customerId = customer.id;

    const warehouse = await WarehouseNodeModel.create({
      type: 'warehouse',
      name: 'Test Warehouse',
      code: 'TEST-WH'
    });
    const bin = await WarehouseNodeModel.create({
      type: 'bin',
      name: 'Test Bin',
      code: 'TEST-WH-BIN-1',
      parentId: warehouse._id
    });
    binId = bin.id;
  });

  it('adjusts inventory on receipt and delivery transitions and guards insufficient stock', async () => {
    const receiptRes = await request(app)
      .post('/api/v1/receipts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: 'RC-100',
        supplierId,
        date: new Date().toISOString(),
        lines: [
          {
            productId,
            qty: 100,
            priceIn: 20,
            locationId: binId
          }
        ]
      });
    expect(receiptRes.status).toBe(201);
    const receiptId = receiptRes.body.data._id ?? receiptRes.body.data.id;

    for (const to of ['approved', 'supplierConfirmed', 'completed']) {
      const res = await request(app)
        .post(`/api/v1/receipts/${receiptId}/transition`)
        .set('Authorization', `Bearer ${token}`)
        .send({ to });
      expect(res.status).toBe(200);
    }

    const inventoryAfterReceipt = await InventoryModel.findOne({
      productId,
      locationId: binId
    }).lean();
    expect(inventoryAfterReceipt?.quantity).toBe(100);

    const deliveryPayload = {
      code: 'DL-100',
      customerId,
      date: new Date().toISOString(),
      expectedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      lines: [
        {
          productId,
          qty: 60,
          priceOut: 30,
          locationId: binId
        }
      ]
    };
    const deliveryRes = await request(app)
      .post('/api/v1/deliveries')
      .set('Authorization', `Bearer ${token}`)
      .send(deliveryPayload);
    expect(deliveryRes.status).toBe(201);
    const deliveryId = deliveryRes.body.data._id ?? deliveryRes.body.data.id;

    for (const to of ['approved', 'prepared', 'delivered', 'completed']) {
      const res = await request(app)
        .post(`/api/v1/deliveries/${deliveryId}/transition`)
        .set('Authorization', `Bearer ${token}`)
        .send({ to });
      expect(res.status).toBe(200);
    }

    const inventoryAfterDelivery = await InventoryModel.findOne({
      productId,
      locationId: binId
    }).lean();
    expect(inventoryAfterDelivery?.quantity).toBe(40);

    // Verify Financial Transaction creation
    const transaction = await FinancialTransactionModel.findOne({
      referenceId: new Types.ObjectId(deliveryId),
      referenceType: 'Delivery'
    }).lean();
    expect(transaction).toBeDefined();
    expect(transaction?.type).toBe('income'); // Should be 'income', not 'revenue'
    expect(transaction?.amount).toBe(1800); // 60 qty * 30 priceOut

    const insufficientDelivery = await request(app)
      .post('/api/v1/deliveries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: 'DL-101',
        customerId,
        date: new Date().toISOString(),
        expectedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        lines: [
          {
            productId,
            qty: 50,
            priceOut: 30,
            locationId: binId
          }
        ]
      });
    expect(insufficientDelivery.status).toBe(409);
    expect(insufficientDelivery.body.error.code).toBe('CONFLICT');

    const inventoryFinal = await InventoryModel.findOne({
      productId,
      locationId: binId
    }).lean();
    expect(inventoryFinal?.quantity).toBe(40);
  });
});
