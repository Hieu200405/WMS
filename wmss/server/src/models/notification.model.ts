import mongoose, { Schema, model, type Document, type Model, Types } from 'mongoose';

export interface Notification {
    userId: Types.ObjectId;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    isRead: boolean;
    actionLink?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationDocument extends Notification, Document { }

const notificationSchema = new Schema<NotificationDocument>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
        title: { type: String, required: true },
        message: { type: String, required: true },
        isRead: { type: Boolean, default: false },
        actionLink: { type: String },
    },
    { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

export const NotificationModel: Model<NotificationDocument> = (mongoose.models.Notification as Model<NotificationDocument>) || model<NotificationDocument>('Notification', notificationSchema);
