import mongoose, { Schema, model, type Document, type Model, Types } from 'mongoose';
import { STOCKTAKE_STATUS, type StocktakeStatus } from '@wms/shared';

export interface StocktakeItem {
  productId: Types.ObjectId;
  locationId: Types.ObjectId;
  systemQty: number;
  countedQty: number;
  serials?: string[];
}

export interface Stocktake {
  code: string;
  date: Date;
  status: StocktakeStatus;
  items: StocktakeItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StocktakeDocument extends Stocktake, Document { }

const stocktakeItemSchema = new Schema<StocktakeItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'WarehouseNode', required: true },
    systemQty: { type: Number, required: true, min: 0 },
    countedQty: { type: Number, required: true, min: 0 },
    serials: { type: [String], default: [] }
  },
  { _id: false }
);

const stocktakeSchema = new Schema<StocktakeDocument>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    date: { type: Date, required: true },
    status: { type: String, enum: STOCKTAKE_STATUS, required: true, default: 'pass' },
    items: { type: [stocktakeItemSchema], default: [] },
  },
  { timestamps: true }
);



export const StocktakeModel: Model<StocktakeDocument> = (mongoose.models.Stocktake as Model<StocktakeDocument>) || model<StocktakeDocument>('Stocktake', stocktakeSchema);
