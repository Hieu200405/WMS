import mongoose, { Schema, model, type Document, type Model, Types } from 'mongoose';
import { FINANCIAL_TRANSACTION_TYPES, FINANCIAL_TRANSACTION_STATUS, type FinancialTransactionType, type FinancialTransactionStatus } from '@wms/shared';

export interface FinancialTransaction {
    partnerId: Types.ObjectId;
    type: FinancialTransactionType;
    status: FinancialTransactionStatus;
    amount: number;
    paidAmount: number;
    paymentDueDate?: Date;
    referenceId?: Types.ObjectId | string;
    referenceType?: 'Receipt' | 'Delivery' | 'Return' | 'Manual';
    date: Date;
    note?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface FinancialTransactionDocument extends FinancialTransaction, Document {
    _id: Types.ObjectId;
}

const financialTransactionSchema = new Schema<FinancialTransactionDocument>(
    {
        partnerId: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
        type: { type: String, enum: FINANCIAL_TRANSACTION_TYPES, required: true },
        status: { type: String, enum: FINANCIAL_TRANSACTION_STATUS, default: 'completed', required: true },
        amount: { type: Number, required: true },
        paidAmount: { type: Number, default: 0, required: true },
        paymentDueDate: { type: Date },
        referenceId: { type: Schema.Types.Mixed },
        referenceType: { type: String, enum: ['Receipt', 'Delivery', 'Return', 'Manual'], default: 'Manual' },
        date: { type: Date, default: Date.now, required: true },
        note: { type: String, trim: true }
    },
    { timestamps: true }
);

financialTransactionSchema.index({ partnerId: 1, date: -1 });
financialTransactionSchema.index({ referenceId: 1 });

export const FinancialTransactionModel: Model<FinancialTransactionDocument> = (mongoose.models.FinancialTransaction as Model<FinancialTransactionDocument>) || model<FinancialTransactionDocument>('FinancialTransaction', financialTransactionSchema);
