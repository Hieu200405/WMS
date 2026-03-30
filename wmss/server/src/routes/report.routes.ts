import { Router } from 'express';
import * as controller from '../controllers/report.controller.js';
import { auth } from '../middlewares/auth.js';

const router = Router();

router.use(auth);

router.get('/overview', controller.overview);
router.get('/inventory', controller.inventory);
router.get('/inbound', controller.inbound);
router.get('/receipts', controller.inbound);
router.get('/outbound', controller.outbound);
router.get('/deliveries', controller.outbound);
router.get('/stocktake', controller.stocktake);
router.get('/stocktaking', controller.stocktake);
router.get('/:type/pdf', controller.pdf);

export default router;
