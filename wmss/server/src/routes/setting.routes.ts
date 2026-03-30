import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/setting.controller.js';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

const updateSchema = z.object({
    key: z.string(),
    value: z.any()
});

router.use(auth);
router.use(requireRole('Admin')); // Only admins can manage settings

router.get('/', controller.list);
router.patch('/', validate({ body: updateSchema }), controller.update);

export default router;
