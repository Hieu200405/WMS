import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/category.controller.js';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

const upsertSchema = z.object({
  code: z.string().min(1).trim().toUpperCase(),
  name: z.string().min(1).trim(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

router.use(auth);

router.get('/', controller.list);
router.post('/', requireRole('Admin', 'Manager'), validate({ body: upsertSchema }), controller.create);
router.put('/:id', requireRole('Admin', 'Manager'), validate({ body: upsertSchema.partial() }), controller.update);
router.delete('/:id', requireRole('Admin', 'Manager'), controller.remove);

export default router;
