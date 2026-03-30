import type { Request, Response } from 'express';
import { listProducts, createProduct, updateProduct, deleteProduct } from '../services/product.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listProducts(req.query as any);
  res.json(result);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const product = await createProduct(req.body, req.user!.id);
  res.status(201).json({ data: product });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const product = await updateProduct(req.params.id, req.body, req.user!.id);
  res.json({ data: product });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await deleteProduct(req.params.id, req.user!.id);
  res.status(204).send();
});
