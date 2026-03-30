import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/partner.controller.js';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { PARTNER_TYPES } from '@wms/shared';

const router = Router();

const baseSchema = z.object({
  type: z.enum(PARTNER_TYPES),
  code: z.string().min(1).trim().toUpperCase(),
  name: z.string().min(1).trim(),
  taxCode: z.string().optional(),
  contact: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  businessType: z.enum(['Manufacturer', 'Distributor', 'Retailer', "Nhà sản xuất", "Nhà phân phối", "Nhà bán lẻ"]).optional(),
  customerType: z.enum(['Individual', 'Corporate', "Cá nhân", "Doanh nghiệp"]).optional(),
  creditLimit: z.number().min(0).optional(),
  paymentTerm: z.string().optional()
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
