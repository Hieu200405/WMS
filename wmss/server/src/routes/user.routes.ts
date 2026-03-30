import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/user.controller.js';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { USER_ROLES } from '@wms/shared';

const router = Router();

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  role: z.enum(USER_ROLES)
});

const updateSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(1).optional(),
  role: z.enum(USER_ROLES).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional()
});

router.use(auth, requireRole('Admin'));

router.get('/', controller.list);
router.post('/', validate({ body: createSchema }), controller.create);
router.get('/:id', controller.getById);
router.put('/:id', validate({ body: updateSchema }), controller.update);
router.delete('/:id', controller.remove);

export default router;
