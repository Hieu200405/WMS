import mongoose, { Schema, model, type Document, type Model, Types } from 'mongoose';
import { ADJUSTMENT_REASONS, type AdjustmentReason } from '@wms/shared';

export interface AdjustmentLine {
  productId: Types.ObjectId;
  locationId: Types.ObjectId;
  batch?: string | null;
  delta: number;
}

export interface Adjustment {
  code: string;
  reason: AdjustmentReason;
  lines: AdjustmentLine[];
  status: 'draft' | 'completed';
  approvedBy?: Types.ObjectId | null;
  approvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdjustmentDocument extends Adjustment, Document { }

const adjustmentLineSchema = new Schema<AdjustmentLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'WarehouseNode', required: true },
    batch: { type: String, trim: true, default: null },
    delta: { type: Number, required: true }
  },
  { _id: false }
);

const adjustmentSchema = new Schema<AdjustmentDocument>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    reason: { type: String, enum: ADJUSTMENT_REASONS, required: true },
    lines: { type: [adjustmentLineSchema], default: [] },
    status: { type: String, enum: ['draft', 'completed'], default: 'draft' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date }
  },
  { timestamps: true }
);



export const AdjustmentModel: Model<AdjustmentDocument> = (mongoose.models.Adjustment as Model<AdjustmentDocument>) || model<AdjustmentDocument>('Adjustment', adjustmentSchema);
