/**
 * Threat Analysis Routes
 * /api/v1/threat-analysis
 */

import { Router } from 'express';
import { threatAnalysisController } from '../controllers';
import { authenticate, asyncHandler } from '../middleware';

const router = Router();

router.use(authenticate);

router.post('/analyze', asyncHandler(threatAnalysisController.analyzeSession));
router.get('/report/:sessionId', asyncHandler(threatAnalysisController.getIntelligenceReport));
router.get('/summary/:sessionId', asyncHandler(threatAnalysisController.getIntelligenceSummary));

export default router;