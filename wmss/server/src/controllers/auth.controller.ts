import type { Request, Response } from 'express';
import { registerUser, login, getProfile } from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, fullName, role } = req.body;
  const user = await registerUser({
    email,
    password,
    fullName,
    role,
    actorId: req.user!.id
  });
  res.status(201).json({ data: user });
});

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await login(req.body);
  res.json({ data: result });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const profile = await getProfile(req.user!.id);
  res.json({ data: profile });
});

export const updatePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPass, newPass } = req.body;
  await import('../services/auth.service.js').then(s => s.changePassword(req.user!.id, { currentPass, newPass }));
  res.json({ success: true, message: 'Password updated' });
});
