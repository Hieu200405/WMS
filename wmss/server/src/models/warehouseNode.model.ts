import mongoose, { Schema, model, type Document, type Model, Types } from 'mongoose';
import { WAREHOUSE_NODE_TYPES, type WarehouseNodeType } from '@wms/shared';

export interface WarehouseNode {
  type: WarehouseNodeType;
  name: string;
  code: string;
  parentId?: Types.ObjectId | null;
  barcode?: string | null;
  warehouseType?: string | null;
  address?: string;
  city?: string;
  province?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  branchId?: Types.ObjectId | null; // Root warehouse ID
  capacity?: number;
  allowedCategories?: Types.ObjectId[];
  preferredProductIds?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WarehouseNodeDocument extends WarehouseNode, Document { }

const warehouseNodeSchema = new Schema<WarehouseNodeDocument>(
  {
    type: { type: String, enum: WAREHOUSE_NODE_TYPES, required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'WarehouseNode', default: null },
    barcode: { type: String, trim: true },
    warehouseType: { type: String, trim: true, default: null },
    // Location/Map info (mostly for Warehouse type)
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    province: { type: String, trim: true },
    lat: { type: Number },
    lng: { type: Number },
    notes: { type: String, trim: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'WarehouseNode', default: null },
    capacity: { type: Number, default: 0 },
    allowedCategories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    preferredProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }]
  },
  { timestamps: true }
);


warehouseNodeSchema.index({ parentId: 1 });

export const WarehouseNodeModel: Model<WarehouseNodeDocument> = (mongoose.models.WarehouseNode as Model<WarehouseNodeDocument>) || model<WarehouseNodeDocument>('WarehouseNode', warehouseNodeSchema);
