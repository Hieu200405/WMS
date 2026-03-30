import type { Request, Response } from 'express';
import { listUsers, getUserById, updateUser, deleteUser } from '../services/user.service.js';
import { registerUser } from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listUsers(req.query as any);
  res.json(result);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const user = await registerUser({
    ...req.body,
    actorId: req.user!.id
  });
  res.status(201).json({ data: user });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserById(req.params.id);
  res.json({ data: user });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  console.log('[UserController] Update Payload:', JSON.stringify(req.body));
  const user = await updateUser(req.params.id, { ...req.body, actorId: req.user!.id });
  res.json({ data: user });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await deleteUser(req.params.id, req.user!.id);
  res.status(204).send();
});
