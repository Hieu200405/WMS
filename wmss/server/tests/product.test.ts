import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { UserModel } from '../src/models/user.model.js';
import { CategoryModel } from '../src/models/category.model.js';
import { env } from '../src/config/env.js';

describe('Product API', () => {
  const app = createApp();
  let token: string;
  let categoryId: string;
  let supplierId: string;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('Admin123!', env.saltRounds);
    const admin = await UserModel.create({
      email: 'admin@test.com',
      passwordHash,
      fullName: 'Admin User',
      role: 'Admin'
    });
    const login = await request(app).post('/api/v1/auth/login').send({
      email: admin.email,
      password: 'Admin123!'
    });
    token = login.body.data.accessToken;
    const category = await CategoryModel.create({ name: 'Beverages', code: 'BEV-001' });
    categoryId = category.id;

    // Create a supplier
    const { PartnerModel } = await import('../src/models/partner.model.js');
    const supplier = await PartnerModel.create({
      type: 'supplier',
      name: 'Test Supplier',
      code: 'SUP-001',
      isActive: true
    });
    supplierId = supplier.id;
  });

  it('performs full CRUD lifecycle on product', async () => {
    const createResponse = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sku: 'PRD-001',
        name: 'Test Product',
        categoryId,
        unit: 'pcs',
        priceIn: 10,
        priceOut: 15,
        minStock: 5,
        preferredSupplierId: supplierId
      });

    expect(createResponse.status).toBe(201);
    const productId = createResponse.body.data._id ?? createResponse.body.data.id;

    const listResponse = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.length).toBe(1);
    expect(listResponse.body.data[0].sku).toBe('PRD-001');

    const updateResponse = await request(app)
      .put(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Product',
        priceOut: 18
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.name).toBe('Updated Product');
    expect(updateResponse.body.data.priceOut).toBe(18);

    const deleteResponse = await request(app)
      .delete(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteResponse.status).toBe(204);

    const listAfterDelete = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${token}`);

    expect(listAfterDelete.status).toBe(200);
    expect(listAfterDelete.body.data.length).toBe(0);
  });
});
