import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/inventory.controller.js';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { objectIdSchema } from '@wms/shared/schemas';

const router = Router();

const moveSchema = z.object({
  productId: objectIdSchema,
  fromLocation: objectIdSchema,
  toLocation: objectIdSchema,
  qty: z.number().positive()
});

router.use(auth);

router.get('/', controller.list);
router.get('/export', controller.exportData);
router.get('/replenishment/check', requireRole('Admin', 'Manager'), controller.checkReplenishment);
router.post('/replenishment/exec', requireRole('Admin', 'Manager'), controller.execReplenishment);
router.post('/move', requireRole('Admin', 'Manager'), validate({ body: moveSchema }), controller.move);
router.post('/release-qc', requireRole('Admin', 'Manager'), controller.releaseQC);

export default router;
