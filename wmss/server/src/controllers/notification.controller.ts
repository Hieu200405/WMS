import type { Request, Response } from 'express';
import * as service from '../services/notification.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const notifications = await service.getUserNotifications(userId);
    const unreadCount = await service.getUnreadCount(userId);
    res.json({ data: notifications, meta: { unreadCount } });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    await service.markAsRead(id, userId);
    res.json({ success: true });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    await service.markAllAsRead(userId);
    res.json({ success: true });
});
