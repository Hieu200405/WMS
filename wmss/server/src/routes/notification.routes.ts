import { Router } from 'express';
import * as controller from '../controllers/notification.controller.js';
import { auth } from '../middlewares/auth.js';

const router = Router();

router.use(auth);

router.get('/', controller.list);
router.patch('/:id/read', controller.markRead);
router.patch('/read-all', controller.markAllRead);

export default router;
