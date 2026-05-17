/**
 * Sandbox Routes
 * /api/v1/sandbox
 */

import { Router } from 'express';
import { sandboxController } from '../controllers';
import { authenticate, authorize, requirePermission, asyncHandler } from '../middleware';
import { UserRole, Permission } from '../types';

const router = Router();

// Sandbox sync endpoints
router.use(authenticate);

// Session endpoints
router.post(
  '/sessions/start',
  authorize(UserRole.SANDBOX_OPERATOR, UserRole.FORENSIC_ANALYST, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(sandboxController.receiveSessionStart)
);

router.post(
  '/sessions/:sessionId/complete',
  authorize(UserRole.SANDBOX_OPERATOR, UserRole.FORENSIC_ANALYST, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(sandboxController.receiveSessionComplete)
);

router.post(
  '/sessions/:sessionId/events',
  authorize(UserRole.SANDBOX_OPERATOR, UserRole.FORENSIC_ANALYST, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(sandboxController.receiveEvents)
);

// List and get sessions
router.get(
  '/sessions',
  authorize(UserRole.FORENSIC_ANALYST, UserRole.SECURITY_REVIEWER, UserRole.SANDBOX_OPERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(sandboxController.findAll)
);

router.get(
  '/sessions/:sessionId',
  authorize(UserRole.FORENSIC_ANALYST, UserRole.SECURITY_REVIEWER, UserRole.SANDBOX_OPERATOR, UserRole.AUDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(sandboxController.findById)
);

// Statistics
router.get(
  '/stats',
  authorize(UserRole.FORENSIC_ANALYST, UserRole.SECURITY_REVIEWER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(sandboxController.getStats)
);

export default router;