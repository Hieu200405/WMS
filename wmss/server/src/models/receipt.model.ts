import mongoose, { Schema, model, type Document, type Model, Types } from 'mongoose';
import { RECEIPT_STATUS, type ReceiptStatus } from '@wms/shared';

export interface ReceiptLine {
  productId: Types.ObjectId;
  qty: number;
  priceIn: number;
  locationId?: Types.ObjectId | null;
  batch?: string; // Batch/Lot number
  expDate?: Date; // Expiry date
  serials?: string[]; // Serial numbers
}

export interface Receipt {
  code: string;
  supplierId: Types.ObjectId;
  date: Date;
  status: ReceiptStatus;
  lines: ReceiptLine[];
  notes?: string;
  rejectedNote?: string;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceiptDocument extends Receipt, Document { }

const receiptLineSchema = new Schema<ReceiptLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    qty: { type: Number, required: true, min: 0 },
    priceIn: { type: Number, required: true, min: 0 },
    locationId: { type: Schema.Types.ObjectId, ref: 'WarehouseNode' },
    batch: { type: String, trim: true },
    expDate: { type: Date },
    serials: { type: [String], default: [] }
  },
  { _id: false }
);

const receiptSchema = new Schema<ReceiptDocument>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: RECEIPT_STATUS, default: 'draft', required: true },
    lines: { type: [receiptLineSchema], default: [] },
    notes: { type: String, trim: true },
    rejectedNote: { type: String, trim: true },
    attachments: { type: [String], default: [] }
  },
  { timestamps: true }
);


receiptSchema.index({ supplierId: 1, date: -1 });

export const ReceiptModel: Model<ReceiptDocument> = (mongoose.models.Receipt as Model<ReceiptDocument>) || model<ReceiptDocument>('Receipt', receiptSchema);
