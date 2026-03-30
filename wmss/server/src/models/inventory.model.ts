import mongoose, { Schema, model, type Document, type Model, Types } from 'mongoose';

export interface Inventory {
  productId: Types.ObjectId;
  locationId: Types.ObjectId;
  quantity: number;
  status: 'available' | 'reserved' | 'pending' | 'special' | 'quarantined';
  batch?: string | null;
  expDate?: Date | null;
  updatedAt: Date;
  createdAt: Date;
}

export interface InventoryDocument extends Inventory, Document { }

const inventorySchema = new Schema<InventoryDocument>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'WarehouseNode', required: true },
    quantity: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['available', 'reserved', 'pending', 'special', 'quarantined'], default: 'available' },
    batch: { type: String, trim: true },
    expDate: { type: Date }
  },
  { timestamps: true }
);


// Critical indexes for inventory queries
inventorySchema.index({ productId: 1, locationId: 1, batch: 1, status: 1 }, { unique: true });
inventorySchema.index({ productId: 1, status: 1 }); // Get available inventory for product
inventorySchema.index({ locationId: 1, status: 1 }); // Get inventory at location
inventorySchema.index({ productId: 1, quantity: 1 }); // Find low stock
inventorySchema.index({ expDate: 1 }, { sparse: true }); // Find expiring items


export const InventoryModel: Model<InventoryDocument> = (mongoose.models.Inventory as Model<InventoryDocument>) || model<InventoryDocument>('Inventory', inventorySchema);
