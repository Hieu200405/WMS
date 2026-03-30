import type { Request, Response, NextFunction } from 'express';
import * as service from '../services/transaction.service.js';
import { exportToExcel } from '../services/excel.service.js';

export const listTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await service.listTransactions(req.query);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const createTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await service.createTransaction(req.body, req.user!.id);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

export const getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await service.getTransactionStats();
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const exportData = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await service.exportTransactionsExcel(req.query as any);
        await exportToExcel(
            res,
            'Transactions',
            [
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Type', key: 'type', width: 10 },
                { header: 'Partner', key: 'partner', width: 25 },
                { header: 'Amount', key: 'amount', width: 15 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Reference', key: 'reference', width: 20 },
                { header: 'Note', key: 'note', width: 30 }
            ],
            data
        );
    } catch (error) {
        next(error);
    }
};
