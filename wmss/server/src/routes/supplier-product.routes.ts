import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/supplier-product.controller.js';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { objectIdSchema } from '@wms/shared/schemas';

const router = Router();

// Zod Schemas
const createSchema = z.object({
    supplierId: objectIdSchema,
    productId: objectIdSchema,
    supplierSku: z.string().optional(),
    priceIn: z.number().min(0).optional(),
    currency: z.string().default('VND'),
    minOrderQty: z.number().min(1).default(1),
    leadTimeDays: z.number().min(0).optional(),
    paymentTerms: z.string().optional(),
    isPreferred: z.boolean().default(false),
    status: z.enum(['active', 'inactive']).default('active'),
    notes: z.string().optional(),
});

const updateSchema = createSchema.partial().omit({ supplierId: true, productId: true });

router.use(auth);

router.get('/', controller.list);
router.post('/', requireRole('Admin', 'Manager'), validate({ body: createSchema }), controller.create);
router.put('/:id', requireRole('Admin', 'Manager'), validate({ body: updateSchema }), controller.update);
router.delete('/:id', requireRole('Admin', 'Manager'), controller.remove);

export default router;
