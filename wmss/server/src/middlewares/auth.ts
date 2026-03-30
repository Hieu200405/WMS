import jwt from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { unauthorized, forbidden } from '../utils/errors.js';
import { UserModel } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

interface TokenPayload {
  sub: string;
  role: string;
  email: string;
  fullName: string;
}

export const auth: RequestHandler = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw unauthorized();
  }
  const token = header.split(' ')[1];


  let decoded: TokenPayload;
  try {
    decoded = jwt.verify(token, env.jwtSecret) as TokenPayload;
  } catch (error) {
    throw unauthorized();
  }

  const user = await UserModel.findById(decoded.sub).lean();
  if (!user || !user.isActive) {
    throw forbidden('User inactive or not found');
  }

  req.user = {
    id: user._id.toString(),
    email: user.email,
    fullName: user.fullName,
    role: user.role as any,
    branchIds: user.branchIds?.map(id => id.toString())
  };
  req.authToken = token;
  next();
});
