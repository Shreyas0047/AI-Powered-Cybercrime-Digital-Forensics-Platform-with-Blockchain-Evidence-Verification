/**
 * AI Analysis Routes
 * /api/v1/ai
 *
 * Handles AI-powered forensic analysis endpoints
 */

import { Router } from 'express';
import { aiController } from '../controllers';
import { authenticate, authorize, requirePermission, asyncHandler } from '../middleware';
import { UserRole, Permission } from '../types';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

// Analyze telemetry from sandbox
router.post(
  '/analyze/telemetry',
  authorize(UserRole.SANDBOX_OPERATOR, UserRole.FORENSIC_ANALYST, UserRole.SECURITY_REVIEWER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(aiController.analyzeTelemetry)
);

// Enrich alert with AI analysis
router.post(
  '/enrich/alert',
  authorize(UserRole.FORENSIC_ANALYST, UserRole.SECURITY_REVIEWER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(aiController.enrichAlert)
);

// Generate AI investigation summary
router.post(
  '/summarize/investigation',
  authorize(UserRole.FORENSIC_ANALYST, UserRole.SECURITY_REVIEWER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(aiController.summarizeInvestigation)
);

// Analyze forensic report
router.post(
  '/analyze/report',
  authorize(UserRole.FORENSIC_ANALYST, UserRole.SECURITY_REVIEWER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(aiController.analyzeReport)
);

// Check AI service health
router.get(
  '/health',
  asyncHandler(aiController.checkHealth)
);

export default router;