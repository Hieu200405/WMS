import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/adjustment.controller.js';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { objectIdSchema } from '@wms/shared/schemas';
import { ADJUSTMENT_REASONS } from '@wms/shared';

const router = Router();

const lineSchema = z.object({
  productId: objectIdSchema,
  locationId: objectIdSchema,
  batch: z.string().trim().optional().nullable(),
  delta: z.number().int().refine((value) => value !== 0, {
    message: 'Delta cannot be zero'
  })
});

const createSchema = z.object({
  code: z.string().min(1),
  reason: z.enum(ADJUSTMENT_REASONS),
  lines: z.array(lineSchema).min(1)
});

router.use(auth);

router.get('/', controller.list);
router.post('/', requireRole('Staff', 'Manager', 'Admin'), validate({ body: createSchema }), controller.create);
router.post('/:id/approve', requireRole('Manager', 'Admin'), controller.approve);
router.delete('/:id', requireRole('Manager', 'Admin'), controller.remove);

export default router;

