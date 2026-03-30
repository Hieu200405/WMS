import mongoose, { Schema, model, type Document } from 'mongoose';

export interface SettingDocument extends Document {
    key: string;
    value: any;
    type: 'string' | 'number' | 'boolean' | 'json';
    group: string;
    description?: string;
    isPublic: boolean;
    updatedAt: Date;
}

const settingSchema = new Schema<SettingDocument>(
    {
        key: { type: String, required: true, unique: true },
        value: { type: Schema.Types.Mixed, required: true },
        type: { type: String, enum: ['string', 'number', 'boolean', 'json'], default: 'string' },
        group: { type: String, default: 'general' },
        description: { type: String },
        isPublic: { type: Boolean, default: false } // If true, can be fetched by public endpoint (e.g. site title)
    },
    { timestamps: true }
);

export const SettingModel = model<SettingDocument>('Setting', settingSchema);
