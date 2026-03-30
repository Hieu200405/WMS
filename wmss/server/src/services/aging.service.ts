import { Types } from 'mongoose';
import { FinancialTransactionModel } from '../models/transaction.model.js';

export interface AgingItem {
    id: string;
    partner: any;
    amount: number;
    paidAmount: number;
    remainingAmount: number;
    dueDate: Date;
    daysOverdue: number;
    isOverdue: boolean;
    agingBucket: string;
    referenceType?: string;
    referenceId: string;
    note?: string;
}

/**
 * Calculate aging for all pending/partial transactions
 */
export const calculateAging = async (): Promise<AgingItem[]> => {
    const now = new Date();
    const transactions = await FinancialTransactionModel.find({
        status: { $in: ['pending', 'partial'] }
    })
        .populate('partnerId', 'name type')
        .lean();

    return transactions.map((txn) => {
        const dueDate = txn.paymentDueDate || txn.date;
        const daysOverdue = Math.floor(
            (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const paidAmount = txn.paidAmount || 0;
        const remainingAmount = txn.amount - paidAmount;

        return {
            id: txn._id.toString(),
            partner: txn.partnerId,
            amount: txn.amount,
            paidAmount,
            remainingAmount,
            dueDate,
            daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
            isOverdue: daysOverdue > 0,
            agingBucket: getAgingBucket(daysOverdue),
            referenceType: txn.referenceType,
            referenceId: txn.referenceId?.toString() || '',
            note: txn.note
        };
    });
};

/**
 * Get aging bucket based on days overdue
 */
function getAgingBucket(days: number): string {
    if (days <= 0) return 'Current';
    if (days <= 30) return '1-30 days';
    if (days <= 60) return '31-60 days';
    if (days <= 90) return '61-90 days';
    return '90+ days';
}

/**
 * Get only overdue transactions
 */
export const getOverdueTransactions = async (): Promise<AgingItem[]> => {
    const aging = await calculateAging();
    return aging.filter((item) => item.isOverdue);
};

/**
 * Get aging summary by bucket
 */
export const getAgingSummary = async () => {
    const aging = await calculateAging();

    const summary = {
        current: { count: 0, amount: 0 },
        '1-30': { count: 0, amount: 0 },
        '31-60': { count: 0, amount: 0 },
        '61-90': { count: 0, amount: 0 },
        '90+': { count: 0, amount: 0 },
        total: { count: 0, amount: 0 }
    };

    aging.forEach((item) => {
        const bucket = item.agingBucket;
        summary.total.count++;
        summary.total.amount += item.remainingAmount;

        switch (bucket) {
            case 'Current':
                summary.current.count++;
                summary.current.amount += item.remainingAmount;
                break;
            case '1-30 days':
                summary['1-30'].count++;
                summary['1-30'].amount += item.remainingAmount;
                break;
            case '31-60 days':
                summary['31-60'].count++;
                summary['31-60'].amount += item.remainingAmount;
                break;
            case '61-90 days':
                summary['61-90'].count++;
                summary['61-90'].amount += item.remainingAmount;
                break;
            case '90+ days':
                summary['90+'].count++;
                summary['90+'].amount += item.remainingAmount;
                break;
        }
    });

    return summary;
};

/**
 * Get aging by partner
 */
export const getAgingByPartner = async (partnerId: string) => {
    const aging = await calculateAging();
    return aging.filter((item) => {
        const partner = item.partner as any;
        return partner?._id?.toString() === partnerId;
    });
};
