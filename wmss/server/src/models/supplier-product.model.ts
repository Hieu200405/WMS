import mongoose, { Schema, model, type Document, type Model, Types } from 'mongoose';

export interface SupplierProduct {
    supplierId: Types.ObjectId;
    productId: Types.ObjectId;
    supplierSku?: string;
    priceIn?: number;
    currency: string;
    minOrderQty?: number;
    leadTimeDays?: number;
    paymentTerms?: string;
    contractRef?: string;
    isPreferred: boolean;
    status: 'active' | 'inactive';
    validFrom?: Date;
    validTo?: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface SupplierProductDocument extends SupplierProduct, Document { }

const supplierProductSchema = new Schema<SupplierProductDocument>(
    {
        supplierId: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        supplierSku: { type: String, trim: true },
        priceIn: { type: Number, min: 0 },
        currency: { type: String, default: 'VND', trim: true },
        minOrderQty: { type: Number, min: 0, default: 1 },
        leadTimeDays: { type: Number, min: 0 },
        paymentTerms: { type: String, trim: true },
        contractRef: { type: String, trim: true },
        isPreferred: { type: Boolean, default: false },
        status: { type: String, enum: ['active', 'inactive'], default: 'active' },
        validFrom: { type: Date },
        validTo: { type: Date },
        notes: { type: String, trim: true }
    },
    { timestamps: true }
);

supplierProductSchema.index({ supplierId: 1, productId: 1 }, { unique: true });
supplierProductSchema.index({ productId: 1, isPreferred: 1 });

export const SupplierProductModel: Model<SupplierProductDocument> = (mongoose.models.SupplierProduct as Model<SupplierProductDocument>) || model<SupplierProductDocument>('SupplierProduct', supplierProductSchema);
