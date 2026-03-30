import type { RequestHandler } from 'express';
import { USER_ROLES, type UserRole } from '@wms/shared';
import { forbidden } from '../utils/errors.js';

const normalizeRole = (role: string): UserRole => {
  if ((USER_ROLES as readonly string[]).includes(role)) {
    return role as UserRole;
  }
  return 'Staff';
};

export const requireRole = (...roles: UserRole[]): RequestHandler => {
  const allowed = new Set(roles);
  return (req, _res, next) => {
    if (!req.user) {
      return next(forbidden('Authentication required'));
    }
    const role = normalizeRole(req.user.role);
    if (!allowed.has(role)) {
      return next(forbidden('Insufficient permissions'));
    }
    return next();
  };
};
