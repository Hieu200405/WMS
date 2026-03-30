import { Router } from 'express';
import { z } from 'zod';
import type { ZodTypeAny } from 'zod';
import multer from 'multer';
import path from 'path';
import * as controller from '../controllers/disposal.controller.js';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { objectIdSchema } from '@wms/shared/schemas';
import { env } from '../config/env.js';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

const parseJsonArray = (schema: ZodTypeAny) =>
  z.preprocess((value) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        return value;
      }
    }
    return value;
  }, schema);

const parseStringArray = z.preprocess((value) => {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (error) {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return value;
}, z.array(z.string()));

const itemSchema = z.object({
  productId: objectIdSchema,
  locationId: objectIdSchema,
  batch: z.string().nullable().optional(),
  qty: z.coerce.number().nonnegative(),
  value: z.coerce.number().nonnegative().optional()
});

const itemsSchema = parseJsonArray(z.array(itemSchema).min(1));

const createSchema = z.object({
  code: z.string().min(1),
  reason: z.string().min(1),
  items: itemsSchema,
  totalValue: z.coerce.number().nonnegative().optional(),
  boardMembers: parseStringArray.optional(),
  boardRequired: z.coerce.boolean().optional(),
  minutesFileUrl: z.string().optional()
});

const updateSchema = z.object({
  items: parseJsonArray(z.array(itemSchema)).optional(),
  totalValue: z.coerce.number().nonnegative().optional(),
  boardMembers: parseStringArray.optional(),
  boardRequired: z.coerce.boolean().optional(),
  minutesFileUrl: z.string().optional()
});

const transitionSchema = z.object({
  to: z.enum(['approved', 'completed'] as const)
});

router.use(auth, requireRole('Manager', 'Admin'));

router.get('/', controller.list);
router.post('/', upload.single('minutesFile'), validate({ body: createSchema }), controller.create);
router.put(
  '/:id',
  upload.single('minutesFile'),
  validate({ body: updateSchema }),
  controller.update
);
router.post(
  '/:id/transition',
  validate({ body: transitionSchema }),
  controller.transition
);
router.delete('/:id', controller.remove);

export default router;
