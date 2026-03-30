import { Types } from 'mongoose';
import { NotificationModel } from '../models/notification.model.js';
import { notFound, badRequest } from '../utils/errors.js';
import { notifyUser } from './socket.service.js';

export const createNotification = async (payload: {
    userId: string | Types.ObjectId;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    actionLink?: string;
}) => {
    const notification = await NotificationModel.create({
        ...payload,
        isRead: false
    });

    // Realtime notification
    notifyUser(payload.userId.toString(), notification.toObject());

    return notification;
};

export const getUserNotifications = async (userId: string, limit = 20) => {
    return await NotificationModel.find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

export const getUnreadCount = async (userId: string) => {
    return await NotificationModel.countDocuments({
        userId: new Types.ObjectId(userId),
        isRead: false
    });
};

export const markAsRead = async (id: string, userId: string) => {
    const notification = await NotificationModel.findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId)
    });

    if (!notification) {
        throw notFound('Notification not found');
    }

    notification.isRead = true;
    await notification.save();
    return notification;
};

export const markAllAsRead = async (userId: string) => {
    await NotificationModel.updateMany(
        { userId: new Types.ObjectId(userId), isRead: false },
        { $set: { isRead: true } }
    );
    return true;
};
