import type { Request, Response } from 'express';
import {
  listReceipts,
  getReceipt,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  transitionReceipt,
  exportReceiptsExcel
} from '../services/receipt.service.js';
import { exportToExcel } from '../services/excel.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuditLogModel } from '../models/auditLog.model.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listReceipts(req.query as any);
  res.json(result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const receipt = await getReceipt(req.params.id);
  res.json({ data: receipt });
});

export const exportData = asyncHandler(async (req: Request, res: Response) => {
  const data = await exportReceiptsExcel(req.query as any);
  await exportToExcel(
    res,
    'Receipts-List',
    [
      { header: 'Code', key: 'code', width: 20 },
      { header: 'Supplier', key: 'supplier', width: 30 },
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Lines', key: 'totalLines', width: 10 },
      { header: 'Total Qty', key: 'totalQty', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 }
    ],
    data
  );
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const receipt = await createReceipt(req.body, req.user!.id);
  res.status(201).json({ data: receipt });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const receipt = await updateReceipt(req.params.id, req.body, req.user!.id);
  res.json({ data: receipt });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await deleteReceipt(req.params.id, req.user!.id);
  res.status(204).send();
});

export const transition = asyncHandler(async (req: Request, res: Response) => {
  const receipt = await transitionReceipt(req.params.id, req.body.to, req.user!.id, req.body.note);
  res.json({ data: receipt });
});

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const logs = await AuditLogModel.find({
    entity: 'Receipt',
    entityId: id
  })
    .populate('actorId', 'name email')
    .sort({ createdAt: -1 });

  res.json({ data: logs });
});
