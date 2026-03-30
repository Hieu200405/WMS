import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let io: Server | null = null;

export const initSocket = (httpServer: HttpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: [env.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'], // Allow env client url and standard vite port
            methods: ['GET', 'POST'],
            credentials: true
        },
        path: '/socket.io',
        pingTimeout: 60000,
    });

    io.on('connection', (socket: Socket) => {
        logger.info(`Socket connected: ${socket.id}`);

        // Join user-specific room for private notifications
        socket.on('join_user_room', (userId: string) => {
            if (userId) {
                socket.join(`user:${userId}`);
                logger.info(`Socket ${socket.id} joined room user:${userId}`);
            }
        });

        // Join resource rooms if needed (e.g. 'inventory_updates', 'receipts_watch')
        // For now we broadcast general updates to everyone, but users can join specific rooms later

        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        // Ideally throw error, but for safety in tests/scripts where header might not be init:
        return null;
    }
    return io;
};

// Typed events helper

/**
 * Notify all clients that a resource has changed so they can refetch list/dashboard
 */
export const notifyResourceUpdate = (resource: 'receipt' | 'delivery' | 'inventory' | 'incident' | 'stocktake' | 'dashboard', action: 'create' | 'update' | 'delete' | 'refresh', data?: any) => {
    if (!io) return;
    io.emit('resource_update', { resource, action, data });
    logger.info(`Emitted resource_update: ${resource} ${action}`);
};

/**
 * Send a specific notification message to a user
 */
export const notifyUser = (userId: string, notification: any) => {
    if (!io) return;
    io.to(`user:${userId}`).emit('notification', notification);
};
