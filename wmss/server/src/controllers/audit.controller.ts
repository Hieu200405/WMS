import type { Request, Response } from 'express';
import { listAuditLogs } from '../services/audit.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
    const result = await listAuditLogs(req.query as any);
    res.json(result);
});

export const exportData = asyncHandler(async (req: Request, res: Response) => {
    const { exportAuditLogs } = await import('../services/audit.service.js');
    const { exportToExcel } = await import('../services/excel.service.js');

    const data = await exportAuditLogs(req.query as any);
    await exportToExcel(
        res,
        'Audit-Logs',
        [
            { header: 'Time', key: 'time', width: 25 },
            { header: 'Action', key: 'action', width: 20 },
            { header: 'Entity', key: 'entity', width: 15 },
            { header: 'Actor', key: 'actor', width: 20 },
            { header: 'Details', key: 'details', width: 50 },
        ],
        data
    );
});
