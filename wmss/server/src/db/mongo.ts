import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

mongoose.set('strictQuery', true);

export const connectMongo = async (): Promise<{ connection: typeof mongoose; isInMemory: boolean }> => {
  try {
    const connection = await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5000 });
    logger.info('MongoDB connected');
    return { connection, isInMemory: false };
  } catch (error) {
    if (env.nodeEnv === 'production') {
      logger.error('MongoDB connection error', { error });
      throw error;
    }

    logger.warn('Failed to connect to local MongoDB. Falling back to In-Memory Database...');
    try {
      // Dynamic import to avoid including it in production build if not needed (though it's in devDeps)
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create({
        instance: {
          port: 27017 // Try to stick to default port if possible, or let it random
        }
      });
      const uri = mongod.getUri();
      logger.info(`In-Memory MongoDB started at ${uri}`);

      const connection = await mongoose.connect(uri);
      return { connection, isInMemory: true };
    } catch (memError) {
      logger.error('Failed to start In-Memory MongoDB', { error: memError });
      throw error; // Throw original or new error? Throw original is better implies root cause.
    }
  }
};

export const disconnectMongo = async (): Promise<void> => {
  await mongoose.disconnect();
};
