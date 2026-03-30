import mongoose, { Schema, model, type Document, type Model, Types } from 'mongoose';
import { RETURN_STATUS, RETURN_FROM, type ReturnStatus, type ReturnFrom } from '@wms/shared';

export interface ReturnItem {
  productId: Types.ObjectId;
  locationId: Types.ObjectId;
  batch?: string | null;
  qty: number;
  reason: string;
  expDate?: Date | null;
  // QC fields
  qcStatus?: 'pending' | 'approved' | 'rejected';
  qcNotes?: string;
  restockQty?: number; // Quantity approved for restock
  disposeQty?: number; // Quantity to dispose
}

export interface Return {
  code: string;
  from: ReturnFrom;
  refId?: Types.ObjectId | null;
  disposalId?: Types.ObjectId | null;
  items: ReturnItem[];
  status: ReturnStatus;
  // QC workflow
  qcInspectedBy?: Types.ObjectId;
  qcInspectedAt?: Date;
  qcNotes?: string;
  adjustmentId?: Types.ObjectId; // Link to auto-created adjustment
  refundTransactionId?: Types.ObjectId; // Link to refund transaction
  createdAt: Date;
  updatedAt: Date;
}

export interface ReturnDocument extends Return, Document { }

const returnItemSchema = new Schema<ReturnItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'WarehouseNode', required: true },
    batch: { type: String, trim: true, default: null },
    qty: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true },
    expDate: { type: Date },
    // QC fields
    qcStatus: { type: String, enum: ['pending', 'approved', 'rejected'] },
    qcNotes: { type: String },
    restockQty: { type: Number, min: 0 },
    disposeQty: { type: Number, min: 0 }
  },
  { _id: false }
);

const returnSchema = new Schema<ReturnDocument>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    from: { type: String, enum: RETURN_FROM, required: true },
    refId: { type: Schema.Types.ObjectId },
    disposalId: { type: Schema.Types.ObjectId, ref: 'Disposal' },
    items: { type: [returnItemSchema], default: [] },
    status: { type: String, enum: RETURN_STATUS, required: true, default: 'draft' },
    // QC workflow
    qcInspectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    qcInspectedAt: { type: Date },
    qcNotes: { type: String },
    adjustmentId: { type: Schema.Types.ObjectId, ref: 'Adjustment' },
    refundTransactionId: { type: Schema.Types.ObjectId, ref: 'FinancialTransaction' }
  },
  { timestamps: true }
);



export const ReturnModel: Model<ReturnDocument> = (mongoose.models.Return as Model<ReturnDocument>) || model<ReturnDocument>('Return', returnSchema);
