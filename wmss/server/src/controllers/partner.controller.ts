import type { Request, Response } from 'express';
import { listPartners, createPartner, updatePartner, deletePartner } from '../services/partner.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listPartners(req.query as any);
  res.json(result);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const partner = await createPartner(req.body, req.user!.id);
  res.status(201).json({ data: partner });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const partner = await updatePartner(req.params.id, req.body, req.user!.id);
  res.json({ data: partner });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await deletePartner(req.params.id, req.user!.id);
  res.status(204).send();
});
