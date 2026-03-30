import { createServer } from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectMongo } from './db/mongo.js';
import { logger } from './utils/logger.js';
import { initSocket } from './services/socket.service.js';

const app = createApp();
const server = createServer(app);

const start = async () => {
  try {
    const { isInMemory } = await connectMongo();

    if (isInMemory) {
      logger.info('⚠️ Using In-Memory Database. Performing auto-seed...');
      // @ts-ignore
      const { seed } = await import('../scripts/seed.ts');
      await seed(true);
    }

    await import('./services/setting.service.js').then(s => s.initializeDefaultSettings());
    // Initialize Socket.io
    initSocket(server);

    // Initial check for expiry alerts
    const { sendExpiryAlerts } = await import('./services/inventory.service.js');
    sendExpiryAlerts().catch(e => logger.warn('Expiry alert check failed at startup', e));

    server.listen(env.port, () => {
      logger.info(`Server listening on port ${env.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

start();

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

export default app;
