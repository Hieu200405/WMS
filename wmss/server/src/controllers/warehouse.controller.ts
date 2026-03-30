import type { Request, Response } from 'express';
import {
  listWarehouseNodes,
  getWarehouseTree,
  createWarehouseNode,
  updateWarehouseNode,
  deleteWarehouseNode
} from '../services/warehouse.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = {
    ...req.query,
    branchIds: req.user?.role === 'Admin' ? undefined : req.user?.branchIds
  };
  const result = await listWarehouseNodes(query as any);
  res.json(result);
});

export const tree = asyncHandler(async (req: Request, res: Response) => {
  const branchIds = req.user?.role === 'Admin' ? undefined : req.user?.branchIds;
  const result = await getWarehouseTree(branchIds);
  res.json({ data: result });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const node = await createWarehouseNode(req.body, req.user!.id);
  res.status(201).json({ data: node });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const node = await updateWarehouseNode(req.params.id, req.body, req.user!.id);
  res.json({ data: node });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await deleteWarehouseNode(req.params.id, req.user!.id);
  res.status(204).send();
});

export const visualize = asyncHandler(async (req: Request, res: Response) => {
  const data = await import('../services/warehouse.service.js').then(s => s.getWarehouseVisualization(req.params.id));
  res.json({ data });
});
