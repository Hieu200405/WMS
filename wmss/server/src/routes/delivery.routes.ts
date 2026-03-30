import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/delivery.controller.js';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { objectIdSchema } from '@wms/shared/schemas';

const router = Router();

const lineSchema = z.object({
  productId: objectIdSchema,
  qty: z.number().positive(),
  priceOut: z.number().nonnegative(),
  locationId: objectIdSchema,
  batch: z.string().optional()
});

const createSchema = z.object({
  code: z.string().min(1),
  customerId: objectIdSchema,
  date: z.coerce.date(),
  expectedDate: z.coerce.date(),
  lines: z.array(lineSchema).min(1),
  notes: z.string().optional()
});

const updateSchema = z.object({
  date: z.coerce.date().optional(),
  lines: z.array(lineSchema).optional(),
  notes: z.string().optional()
});

const transitionSchema = z.object({
  to: z.enum(['approved', 'prepared', 'delivered', 'completed', 'rejected'] as const),
  note: z.string().optional()
});

router.use(auth);

router.get('/export', controller.exportData);
router.get('/:id/audit-logs', controller.getAuditLogs);
router.get('/:id', controller.getById);
router.get('/', controller.list);
// Route for smart allocation
router.post('/allocate', requireRole('Staff', 'Manager', 'Admin'), controller.allocateInventory);

router.post('/', requireRole('Staff', 'Manager', 'Admin'), validate({ body: createSchema }), controller.create);
router.put('/:id', requireRole('Staff', 'Manager', 'Admin'), validate({ body: updateSchema }), controller.update);
router.delete('/:id', requireRole('Admin'), controller.remove);
router.post(
  '/:id/transition',
  requireRole('Admin', 'Manager'),
  validate({ body: transitionSchema }),
  controller.transition
);

export default router;
