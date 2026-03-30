import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  try {
    console.log('[SETUP] Starting MongoDB Memory Server...');
    process.env.BCRYPT_ROUNDS = '1';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX = '1000';

    jest.setTimeout(300000); // 5 minutes for download
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    console.log('[SETUP] MongoDB URI:', uri);
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);
    console.log('[SETUP] Connected to MongoDB');
  } catch (e) {
    console.error('[SETUP] Error:', e);
    throw e;
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
});

afterEach(async () => {
  const db = mongoose.connection.db;
  if (!db) {
    return;
  }
  const collections = await db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});
