/**
 * Settings Routes
 * /api/v1/settings
 */

import { Router } from 'express';
import { settingsController } from '../controllers';
import { authenticate, asyncHandler } from '../middleware';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(settingsController.getSettings));
router.put('/', asyncHandler(settingsController.updateSettings));
router.post('/reset', asyncHandler(settingsController.resetSettings));

export default router;