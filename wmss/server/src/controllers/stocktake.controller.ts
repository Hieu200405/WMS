import type { Request, Response } from 'express';
import {
  listStocktakes,
  createStocktake,
  updateStocktake,
  deleteStocktake
} from '../services/stocktake.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listStocktakes(req.query as any);
  res.json(result);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const stocktake = await createStocktake(req.body, req.user!.id);
  res.status(201).json({ data: stocktake });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const stocktake = await updateStocktake(req.params.id, req.body, req.user!.id);
  res.json({ data: stocktake });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await deleteStocktake(req.params.id, req.user!.id);
  res.status(204).send();
});
