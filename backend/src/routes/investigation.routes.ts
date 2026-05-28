/**
 * Investigation Routes
 * /api/v1/investigations
 */

import { Router } from 'express';
import { investigationController } from '../controllers';
import { authenticate, authorize, requirePermission, asyncHandler } from '../middleware';
import { UserRole, Permission } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Public read for analysts and above, write for investigators and above
router.get(
  '/',
  authorize(UserRole.FORENSIC_ANALYST, UserRole.SECURITY_REVIEWER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(investigationController.findAll)
);

router.get(
  '/stats',
  authorize(UserRole.FORENSIC_ANALYST, UserRole.SECURITY_REVIEWER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(investigationController.getStats)
);

router.get(
  '/:id',
  authorize(UserRole.FORENSIC_ANALYST, UserRole.SECURITY_REVIEWER, UserRole.SANDBOX_OPERATOR, UserRole.AUDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(investigationController.findById)
);

router.post(
  '/',
  requirePermission(Permission.INVESTIGATION_CREATE),
  asyncHandler(investigationController.create)
);

router.put(
  '/:id',
  requirePermission(Permission.INVESTIGATION_UPDATE),
  asyncHandler(investigationController.update)
);

// Get forensic report for investigation
router.get(
  '/:id/forensic-report',
  authorize(UserRole.FORENSIC_ANALYST, UserRole.SECURITY_REVIEWER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(investigationController.getForensicReport)
);

router.delete(
  '/:id',
  requirePermission(Permission.INVESTIGATION_DELETE),
  asyncHandler(investigationController.delete)
);

export default router;