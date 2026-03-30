import type { Request, Response } from 'express';
import {
  listAdjustments,
  createAdjustment,
  approveAdjustment,
  deleteAdjustment
} from '../services/adjustment.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listAdjustments(req.query as any);
  res.json(result);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const adjustment = await createAdjustment(req.body, req.user!.id);
  res.status(201).json({ data: adjustment });
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  const adjustment = await approveAdjustment(req.params.id, req.user!.id);
  res.json({ data: adjustment });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await deleteAdjustment(req.params.id, req.user!.id);
  res.status(204).send();
});
