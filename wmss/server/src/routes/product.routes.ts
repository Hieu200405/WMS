import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/product.controller.js';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { objectIdSchema } from '@wms/shared/schemas';

const router = Router();

const baseSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  categoryId: objectIdSchema,
  preferredSupplierId: objectIdSchema,
  unit: z.string().min(1),
  priceIn: z.number().nonnegative(),
  priceOut: z.number().nonnegative(),
  minStock: z.number().nonnegative(),
  image: z.string().optional(),
  description: z.string().optional(),
  supplierIds: z.array(objectIdSchema).optional()
});

router.use(auth);

router.get('/', controller.list);
router.post('/', requireRole('Admin', 'Manager'), validate({ body: baseSchema }), controller.create);
router.put(
  '/:id',
  requireRole('Admin', 'Manager'),
  validate({ body: baseSchema.partial() }),
  controller.update
);
router.delete('/:id', requireRole('Admin', 'Manager'), controller.remove);

export default router;
