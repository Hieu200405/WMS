import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { UserModel } from '../src/models/user.model.js';
import { env } from '../src/config/env.js';

describe('Auth API', () => {
  const app = createApp();

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('Admin123!', env.saltRounds);
    await UserModel.create({
      email: 'admin@test.com',
      passwordHash,
      fullName: 'Admin User',
      role: 'Admin'
    });
  });

  it('should login with valid credentials', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@test.com',
      password: 'Admin123!'
    });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeDefined();
  });

  it('should allow admin to register new user', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@test.com',
      password: 'Admin123!'
    });

    const token = login.body.data.accessToken;
    const response = await request(app)
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'manager@test.com',
        password: 'Manager123!',
        fullName: 'Manager',
        role: 'Manager'
      });

    expect(response.status).toBe(201);
    expect(response.body.data.email).toBe('manager@test.com');
  });

  it('should return authenticated profile with /auth/me', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@test.com',
      password: 'Admin123!'
    });

    const token = login.body.data.accessToken;
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe('admin@test.com');
    expect(response.body.data.role).toBe('Admin');
  });
});
