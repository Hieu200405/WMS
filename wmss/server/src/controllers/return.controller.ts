import type { Request, Response } from 'express';
import {
  listReturns,
  createReturn,
  updateReturn,
  transitionReturn,
  deleteReturn
} from '../services/return.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listReturns(req.query as any);
  res.json(result);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const doc = await createReturn(req.body, req.user!.id);
  res.status(201).json({ data: doc });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const doc = await updateReturn(req.params.id, req.body, req.user!.id);
  res.json({ data: doc });
});

export const transition = asyncHandler(async (req: Request, res: Response) => {
  const doc = await transitionReturn(req.params.id, req.body.to, req.user!.id);
  res.json({ data: doc });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await deleteReturn(req.params.id, req.user!.id);
  res.status(204).send();
});
