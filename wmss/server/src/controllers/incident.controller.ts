import type { Request, Response } from 'express';
import { listIncidents, createIncident, updateIncident, deleteIncident } from '../services/incident.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listIncidents(req.query as any);
  res.json(result);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const incident = await createIncident(req.body, req.user!.id);
  res.status(201).json({ data: incident });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const incident = await updateIncident(req.params.id, req.body, req.user!.id);
  res.json({ data: incident });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await deleteIncident(req.params.id, req.user!.id);
  res.status(204).send();
});
