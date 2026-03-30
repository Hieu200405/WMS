import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/return.controller.js';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { objectIdSchema } from '@wms/shared/schemas';

const router = Router();

const itemSchema = z.object({
  productId: objectIdSchema,
  locationId: objectIdSchema,
  batch: z.string().nullable().optional(),
  qty: z.number().positive(),
  reason: z.string().min(1),
  expDate: z.coerce.date().optional()
});

const createSchema = z.object({
  code: z.string().min(1),
  from: z.enum(['customer', 'supplier'] as const),
  refId: objectIdSchema.optional(),
  items: z.array(itemSchema).min(1)
});

const updateSchema = z.object({
  items: z.array(itemSchema).optional()
});

const transitionSchema = z.object({
  to: z.enum(['approved', 'completed'] as const)
});

router.use(auth);

router.get('/', controller.list);
router.post('/', requireRole('Staff', 'Manager', 'Admin'), validate({ body: createSchema }), controller.create);
router.put('/:id', requireRole('Staff', 'Manager', 'Admin'), validate({ body: updateSchema }), controller.update);
router.post(
  '/:id/transition',
  requireRole('Manager', 'Admin'),
  validate({ body: transitionSchema }),
  controller.transition
);
router.delete('/:id', requireRole('Manager', 'Admin'), controller.remove);

export default router;
