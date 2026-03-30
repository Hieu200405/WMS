import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/warehouse.controller.js';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { WAREHOUSE_NODE_TYPES } from '@wms/shared';
import { objectIdSchema } from '@wms/shared/schemas';

const router = Router();

const createSchema = z.object({
  type: z.enum(WAREHOUSE_NODE_TYPES),
  name: z.string().min(1),
  code: z.string().min(1),
  parentId: objectIdSchema.optional(),
  barcode: z.string().optional(),
  warehouseType: z.string().optional(),
  capacity: z.number().min(0).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  notes: z.string().optional()
});

const updateSchema = z.object({
  name: z.string().optional(),
  barcode: z.string().nullable().optional(),
  parentId: objectIdSchema.nullable().optional(),
  warehouseType: z.string().nullable().optional(),
  capacity: z.number().min(0).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  notes: z.string().optional()
});

router.use(auth);

router.get('/', controller.list);
router.get('/tree', controller.tree);
router.get('/:id/visualization', controller.visualize);
router.post('/', requireRole('Admin', 'Manager'), validate({ body: createSchema }), controller.create);
router.put(
  '/:id',
  requireRole('Admin', 'Manager'),
  validate({ body: updateSchema }),
  controller.update
);
router.delete('/:id', requireRole('Admin'), controller.remove);

export default router;
