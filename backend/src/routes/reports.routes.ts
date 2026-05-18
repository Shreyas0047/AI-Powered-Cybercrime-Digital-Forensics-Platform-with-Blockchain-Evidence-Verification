/**
 * Reports Routes
 * /api/v1/reports
 */

import { Router } from 'express';
import { reportsController } from '../controllers';
import { authenticate, asyncHandler } from '../middleware';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(reportsController.findAll));
router.get('/:id', asyncHandler(reportsController.findById));
router.get('/:id/export', asyncHandler(reportsController.exportReport));

export default router;