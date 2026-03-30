import mongoose, { Schema, model, type Document, type Model, Types } from 'mongoose';

export type SerialStatus = 'in_stock' | 'sold' | 'returned' | 'lost' | 'damaged';

export interface Serial {
    serialNumber: string;
    productId: Types.ObjectId;
    locationId: Types.ObjectId;
    status: SerialStatus;
    batch?: string;
    receiptId?: Types.ObjectId;
    deliveryId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface SerialDocument extends Serial, Document { }

const serialSchema = new Schema<SerialDocument>(
    {
        serialNumber: { type: String, required: true, unique: true, trim: true },
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        locationId: { type: Schema.Types.ObjectId, ref: 'WarehouseNode', required: true },
        status: { type: String, enum: ['in_stock', 'sold', 'returned', 'lost', 'damaged'], default: 'in_stock' },
        batch: { type: String },
        receiptId: { type: Schema.Types.ObjectId, ref: 'Receipt' },
        deliveryId: { type: Schema.Types.ObjectId, ref: 'Delivery' }
    },
    { timestamps: true }
);

serialSchema.index({ serialNumber: 1 }, { unique: true });
serialSchema.index({ productId: 1, status: 1 });
serialSchema.index({ locationId: 1 });

export const SerialModel: Model<SerialDocument> = (mongoose.models.Serial as Model<SerialDocument>) || model<SerialDocument>('Serial', serialSchema);
