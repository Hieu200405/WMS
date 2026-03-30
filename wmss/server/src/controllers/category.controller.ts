import type { Request, Response } from 'express';
import { listCategories, createCategory, updateCategory, deleteCategory } from '../services/category.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listCategories(req.query as any);
  res.json(result);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const category = await createCategory(req.body, req.user!.id);
  res.status(201).json({ data: category });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const category = await updateCategory(req.params.id, req.body, req.user!.id);
  res.json({ data: category });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await deleteCategory(req.params.id, req.user!.id);
  res.status(204).send();
});
