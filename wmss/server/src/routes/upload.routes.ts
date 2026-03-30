import { Router } from 'express';
import { upload } from '../middlewares/upload.middleware.js';
import { uploadImage } from '../controllers/upload.controller.js';
import { auth } from '../middlewares/auth.js';

const router = Router();

router.use(auth);

router.post('/image', upload.single('image'), uploadImage);

export default router;
