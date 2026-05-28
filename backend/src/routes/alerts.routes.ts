/**
 * Alerts Routes
 * /api/v1/alerts
 */

import { Router } from 'express';
import { alertController } from '../controllers/alerts.controller';
import { authenticate, authorize, asyncHandler } from '../middleware';
import { UserRole } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List all alerts
router.get(
  '/',
  authorize(UserRole.FORENSIC_ANALYST, UserRole.SECURITY_REVIEWER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(alertController.findAll)
);

// Get alert by ID
router.get(
  '/:id',
  authorize(UserRole.FORENSIC_ANALYST, UserRole.SECURITY_REVIEWER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(alertController.findById)
);

// Acknowledge alert
router.post(
  '/:id/acknowledge',
  authorize(UserRole.FORENSIC_ANALYST, UserRole.SECURITY_REVIEWER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(alertController.acknowledge)
);

// Resolve alert
router.post(
  '/:id/resolve',
  authorize(UserRole.FORENSIC_ANALYST, UserRole.SECURITY_REVIEWER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(alertController.resolve)
);

export default router;
