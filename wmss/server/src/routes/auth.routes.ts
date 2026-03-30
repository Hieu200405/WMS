import { Router } from 'express';
import { z } from 'zod';
import { register, loginHandler, me, updatePassword } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { USER_ROLES } from '@wms/shared';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  role: z.enum(USER_ROLES)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

router.post('/register', auth, requireRole('Admin'), validate({ body: registerSchema }), register);
router.post('/login', validate({ body: loginSchema }), loginHandler);
router.get('/me', auth, me);
router.put('/password', auth, validate({ body: z.object({ currentPass: z.string(), newPass: z.string().min(8) }) }), updatePassword);

export default router;
