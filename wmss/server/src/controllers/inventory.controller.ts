import type { Request, Response } from 'express';
import { listInventory, moveInventory, exportInventoryExcel } from '../services/inventory.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { exportToExcel } from '../services/excel.service.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = {
    ...req.query,
    branchIds: req.user?.role === 'Admin' ? undefined : req.user?.branchIds
  };
  const result = await listInventory(query as any);
  res.json(result);
});

export const move = asyncHandler(async (req: Request, res: Response) => {
  await moveInventory(req.body);
  res.status(200).json({ message: 'Inventory moved' });
});

export const exportData = asyncHandler(async (req: Request, res: Response) => {
  const data = await exportInventoryExcel(req.query as any);
  await exportToExcel(
    res,
    'Inventory-Report',
    [
      { header: 'Product SKU', key: 'sku', width: 20 },
      { header: 'Product Name', key: 'name', width: 40 },
      { header: 'Location', key: 'location', width: 30 },
      { header: 'Quantity', key: 'quantity', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Batch', key: 'batch', width: 20 },
      { header: 'Expiry Date', key: 'expDate', width: 20 }
    ],
    data
  );
});

export const checkReplenishment = asyncHandler(async (req: Request, res: Response) => {
  const data = await import('../services/replenishment.service.js').then(s => s.getReplenishmentSuggestions());
  res.json({ data });
});

export const execReplenishment = asyncHandler(async (req: Request, res: Response) => {
  const { suggestions } = req.body;
  const result = await import('../services/replenishment.service.js').then(s => s.createReplenishmentOrders(suggestions, req.user!.id));
  res.json({ data: result, message: `Created ${result.length} draft receipts` });
});
export const releaseQC = asyncHandler(async (req: Request, res: Response) => {
  const { productId, locationId, qty, batch } = req.body;
  const { releaseQuarantine } = await import('../services/inventory.service.js');
  await releaseQuarantine(productId, locationId, qty, batch);
  res.json({ message: 'Stock released from quarantine' });
});
