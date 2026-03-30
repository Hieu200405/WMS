import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/stocktake.controller.js';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { objectIdSchema } from '@wms/shared/schemas';

const router = Router();

const itemSchema = z.object({
  productId: objectIdSchema,
  locationId: objectIdSchema,
  systemQty: z.number().nonnegative().optional(),
  countedQty: z.number().nonnegative()
});

const createSchema = z.object({
  code: z.string().min(1),
  date: z.coerce.date(),
  items: z.array(itemSchema).min(1)
});

const updateSchema = z.object({
  date: z.coerce.date().optional(),
  items: z.array(itemSchema).optional()
});

router.use(auth);

router.get('/', controller.list);
router.post('/', requireRole('Staff', 'Manager', 'Admin'), validate({ body: createSchema }), controller.create);
router.put('/:id', requireRole('Staff', 'Manager', 'Admin'), validate({ body: updateSchema }), controller.update);
router.delete('/:id', requireRole('Manager', 'Admin'), controller.remove);

export default router;
