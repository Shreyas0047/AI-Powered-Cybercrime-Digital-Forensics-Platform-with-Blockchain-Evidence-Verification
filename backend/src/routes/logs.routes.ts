/**
 * Logs Routes
 * /api/v1/logs
 */

import { Router } from 'express';
import { logsController } from '../controllers';
import { authenticate, asyncHandler } from '../middleware';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(logsController.findAll));
router.get('/stats', asyncHandler(logsController.getStats));

export default router;