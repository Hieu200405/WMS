import { Router } from 'express';
import * as controller from '../controllers/audit.controller.js';
import { auth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';

const router = Router();

router.use(auth);
router.use(requireRole('Admin')); // Only admins can see audit logs

router.get('/', controller.list);
router.get('/export', controller.exportData);

export default router;
