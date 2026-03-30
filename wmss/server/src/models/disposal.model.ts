import mongoose, { Schema, model, type Document, type Model, Types } from 'mongoose';
import { DISPOSAL_STATUS, DISPOSAL_REASONS, type DisposalStatus, type DisposalReason } from '@wms/shared';

export interface DisposalItem {
  productId: Types.ObjectId;
  locationId: Types.ObjectId;
  batch?: string | null;
  qty: number;
  value?: number;
}

export interface Disposal {
  code: string;
  reason: DisposalReason;
  totalValue: number;
  boardRequired: boolean;
  boardMembers?: string[];
  minutesFileUrl?: string | null;
  status: DisposalStatus;
  items: DisposalItem[];
  // Approval workflow fields
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  approvalNotes?: string;
  attachments?: string[]; // URLs to disposal documents
  photos?: string[]; // URLs to photos (before/after)
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface DisposalDocument extends Disposal, Document { }

const disposalItemSchema = new Schema<DisposalItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'WarehouseNode', required: true },
    batch: { type: String, trim: true, default: null },
    qty: { type: Number, required: true, min: 0 },
    value: { type: Number, min: 0 }
  },
  { _id: false }
);

const disposalSchema = new Schema<DisposalDocument>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    reason: { type: String, enum: DISPOSAL_REASONS, required: true },
    totalValue: { type: Number, required: true, min: 0 },
    boardRequired: { type: Boolean, required: true, default: false },
    boardMembers: { type: [String], default: [] },
    minutesFileUrl: { type: String, trim: true },
    status: { type: String, enum: DISPOSAL_STATUS, required: true, default: 'draft' },
    items: { type: [disposalItemSchema], default: [] },
    // Approval workflow
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    approvalNotes: { type: String },
    attachments: [{ type: String }],
    photos: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);



disposalSchema.pre('save', function (next) {
  if (this.boardRequired && (!this.boardMembers || this.boardMembers.length === 0)) {
    this.invalidate('boardMembers', 'Board members required when boardRequired is true');
  }
  next();
});

export const DisposalModel: Model<DisposalDocument> = (mongoose.models.Disposal as Model<DisposalDocument>) || model<DisposalDocument>('Disposal', disposalSchema);
