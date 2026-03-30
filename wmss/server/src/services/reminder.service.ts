import { Types } from 'mongoose';
import { getOverdueTransactions } from './aging.service.js';
import { createNotification } from './notification.service.js';
import { UserModel } from '../models/user.model.js';
import { FinancialTransactionDocument } from '../models/transaction.model.js';

/**
 * Send payment reminders for overdue transactions
 * Should be called periodically (e.g., daily cron job)
 */
export const sendPaymentReminders = async () => {
    try {
        const overdueTransactions = await getOverdueTransactions();

        if (overdueTransactions.length === 0) {
            return { sent: 0, message: 'No overdue transactions' };
        }

        // Get all managers and admins
        const managers = await UserModel.find({
            role: { $in: ['Admin', 'Manager'] }
        });

        let sentCount = 0;

        // Group by partner for better notification
        const byPartner = overdueTransactions.reduce((acc, item) => {
            const partnerId = (item.partner as any)?._id?.toString() || 'unknown';
            if (!acc[partnerId]) {
                acc[partnerId] = {
                    partner: item.partner,
                    transactions: []
                };
            }
            acc[partnerId].transactions.push(item);
            return acc;
        }, {} as Record<string, any>);

        // Send notifications to managers
        for (const manager of managers) {
            for (const [partnerId, data] of Object.entries(byPartner)) {
                const partnerName = (data.partner as any)?.name || 'Unknown';
                const totalAmount = data.transactions.reduce(
                    (sum: number, t: any) => sum + t.remainingAmount,
                    0
                );
                const count = data.transactions.length;

                await createNotification({
                    userId: (manager as any)._id.toString(),
                    type: 'warning',
                    title: 'Nhắc nhở thanh toán quá hạn',
                    message: `${partnerName} có ${count} khoản thanh toán quá hạn, tổng ${totalAmount.toLocaleString('vi-VN')} VNĐ. Vui lòng liên hệ để thu hồi công nợ.`
                });

                sentCount++;
            }
        }

        return {
            sent: sentCount,
            overdueCount: overdueTransactions.length,
            message: `Sent ${sentCount} payment reminders`
        };
    } catch (error) {
        console.error('Failed to send payment reminders:', error);
        throw error;
    }
};

/**
 * Send reminder for specific transaction
 */
export const sendTransactionReminder = async (
    transactionId: string,
    userId: string
) => {
    const { FinancialTransactionModel } = await import('../models/transaction.model.js');

    const transaction: FinancialTransactionDocument | null = await FinancialTransactionModel.findById(
        new Types.ObjectId(transactionId)
    ).populate('partnerId', 'name');

    if (!transaction) {
        throw new Error('Transaction not found');
    }

    const partner = (transaction.partnerId as any)?.name || 'Unknown';
    const amount = transaction.amount - (transaction.paidAmount || 0);

    await createNotification({
        userId,
        type: 'info',
        title: 'Nhắc nhở thanh toán',
        message: `Nhắc nhở thanh toán cho ${partner}: ${amount.toLocaleString('vi-VN')} VNĐ. Mã giao dịch: ${transaction._id.toString().slice(-6)}`
    });

    return { success: true };
};

/**
 * Get reminder schedule recommendations
 */
export const getReminderSchedule = async () => {
    const overdueTransactions = await getOverdueTransactions();

    return {
        immediate: overdueTransactions.filter(t => t.daysOverdue >= 30).length,
        urgent: overdueTransactions.filter(t => t.daysOverdue >= 60).length,
        critical: overdueTransactions.filter(t => t.daysOverdue >= 90).length,
        total: overdueTransactions.length,
        recommendation: overdueTransactions.length > 0
            ? 'Send reminders immediately'
            : 'No action needed'
    };
};
