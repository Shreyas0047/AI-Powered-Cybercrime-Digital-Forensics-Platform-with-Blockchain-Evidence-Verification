/**
 * Evidence Artifacts Routes
 * /api/v1/evidence/artifacts
 */

import { Router } from 'express';
import { evidenceArtifactsController } from '../controllers';
import { authenticate, asyncHandler } from '../middleware';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(evidenceArtifactsController.findAll));
router.get('/:id', asyncHandler(evidenceArtifactsController.findById));

export default router;