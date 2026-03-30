import { Types } from 'mongoose';
import { FinancialTransactionModel } from '../models/transaction.model.js';
import { buildPagedResponse, parsePagination } from '../utils/pagination.js';
import { badRequest, notFound } from '../utils/errors.js';
import { recordAudit } from './audit.service.js';
import type { FinancialTransactionType, FinancialTransactionStatus } from '@wms/shared';

type ListQuery = {
    page?: string;
    limit?: string;
    sort?: string;
    startDate?: string;
    endDate?: string;
    type?: FinancialTransactionType;
    partnerId?: string;
    status?: FinancialTransactionStatus;
    referenceType?: string;
};

export const listTransactions = async (query: ListQuery) => {
    const { page, limit, sort, skip } = parsePagination(query);
    const filter: Record<string, unknown> = {};

    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;
    if (query.partnerId) filter.partnerId = new Types.ObjectId(query.partnerId);
    if (query.referenceType) filter.referenceType = query.referenceType;

    if (query.startDate || query.endDate) {
        const dateQuery: Record<string, Date> = {};
        if (query.startDate) dateQuery.$gte = new Date(query.startDate);
        if (query.endDate) dateQuery.$lte = new Date(query.endDate);
        filter.date = dateQuery;
    }

    const [total, items] = await Promise.all([
        FinancialTransactionModel.countDocuments(filter),
        FinancialTransactionModel.find(filter)
            .populate('partnerId', 'name type')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean()
    ]);

    return buildPagedResponse(
        items.map((item) => ({
            id: item._id.toString(),
            partner: item.partnerId,
            type: item.type,
            status: item.status,
            amount: item.amount,
            referenceId: item.referenceId,
            referenceType: item.referenceType,
            date: item.date,
            note: item.note,
            createdAt: item.createdAt
        })),
        total,
        { page, limit, sort, skip }
    );
};

export const createTransaction = async (
    payload: {
        partnerId: string;
        type: FinancialTransactionType;
        amount: number;
        referenceId?: string;
        referenceType?: 'Receipt' | 'Delivery' | 'Return' | 'Manual';
        date?: Date;
        note?: string;
        status?: FinancialTransactionStatus;
    },
    actorId: string
) => {
    if (payload.amount < 0) {
        throw badRequest('Amount must be positive');
    }

    const transaction = await FinancialTransactionModel.create({
        partnerId: new Types.ObjectId(payload.partnerId),
        type: payload.type,
        amount: payload.amount,
        status: payload.status ?? 'completed',
        referenceId: payload.referenceId ? new Types.ObjectId(payload.referenceId) : undefined,
        referenceType: payload.referenceType ?? 'Manual',
        date: payload.date ?? new Date(),
        note: payload.note
    });

    await recordAudit({
        action: 'transaction.created',
        entity: 'FinancialTransaction',
        entityId: transaction._id,
        actorId,
        payload: {
            type: transaction.type,
            amount: transaction.amount,
            referenceType: transaction.referenceType
        }
    });

    return transaction.toObject();
};

export const getTransactionStats = async () => {
    // Simple aggregation for dashboard
    const stats = await FinancialTransactionModel.aggregate([
        {
            $group: {
                _id: '$type',
                totalAmount: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        }
    ]);

    const income = stats.find(s => s._id === 'income')?.totalAmount || 0;
    const expense = stats.find(s => s._id === 'expense')?.totalAmount || 0;

    return {
        revenue: income, // Keep 'revenue' key for backward compatibility with API consumers
        expense,
        profit: income - expense
    };
};

export const exportTransactionsExcel = async (query: ListQuery) => {
    const filter: Record<string, unknown> = {};

    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;
    if (query.partnerId) filter.partnerId = new Types.ObjectId(query.partnerId);
    if (query.referenceType) filter.referenceType = query.referenceType;

    if (query.startDate || query.endDate) {
        const dateQuery: Record<string, Date> = {};
        if (query.startDate) dateQuery.$gte = new Date(query.startDate);
        if (query.endDate) dateQuery.$lte = new Date(query.endDate);
        filter.date = dateQuery;
    }

    const items = await FinancialTransactionModel.find(filter)
        .populate('partnerId', 'name type')
        .sort({ date: -1 })
        .lean();

    return items.map((item: any) => ({
        date: new Date(item.date).toLocaleDateString('vi-VN'),
        type: item.type === 'income' ? 'Thu' : 'Chi',
        partner: item.partnerId?.name || 'N/A',
        amount: item.amount,
        status: item.status,
        reference: `${item.referenceType} ${item.referenceId || ''}`,
        note: item.note || ''
    }));
};
