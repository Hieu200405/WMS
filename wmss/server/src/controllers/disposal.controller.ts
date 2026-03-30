import type { Request, Response } from 'express';
import {
  listDisposals,
  createDisposal,
  updateDisposal,
  transitionDisposal,
  deleteDisposal
} from '../services/disposal.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const resolveMinutesFile = (req: Request) => {
  if (req.file) {
    return `/uploads/${req.file.filename}`;
  }
  return req.body.minutesFileUrl;
};

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listDisposals(req.query as any);
  res.json(result);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const payload = {
    ...req.body,
    minutesFileUrl: resolveMinutesFile(req)
  };
  const disposal = await createDisposal(payload, req.user!.id);
  res.status(201).json({ data: disposal });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const payload = {
    ...req.body,
    minutesFileUrl: resolveMinutesFile(req)
  };
  const disposal = await updateDisposal(req.params.id, payload, req.user!.id);
  res.json({ data: disposal });
});

export const transition = asyncHandler(async (req: Request, res: Response) => {
  const disposal = await transitionDisposal(req.params.id, req.body.to, req.user!.id);
  res.json({ data: disposal });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await deleteDisposal(req.params.id, req.user!.id);
  res.status(204).send();
});
