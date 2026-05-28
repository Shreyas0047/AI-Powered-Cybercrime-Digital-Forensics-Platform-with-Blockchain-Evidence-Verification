/**
 * User Routes
 * /api/v1/users
 * Protected routes for user management
 */

import { Router } from 'express';
import { userController } from '../controllers';
import { authenticate, authorize, requirePermission, asyncHandler } from '../middleware';
import { UserRole, Permission } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get current user profile
router.get('/me', asyncHandler(async (req: any, res) => {
  const response = {
    success: true,
    message: 'Current user retrieved',
    data: { user: req.user },
  };
  res.json(response);
}));

// Get user stats (admin only)
router.get(
  '/stats',
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  asyncHandler(userController.getStats)
);

// Get all users (admin only)
router.get(
  '/',
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  asyncHandler(userController.findAll)
);

// Get user by ID
router.get(
  '/:id',
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  asyncHandler(userController.findById)
);

// Get user activity
router.get(
  '/:id/activity',
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FORENSIC_ANALYST),
  asyncHandler(userController.getActivity)
);

// Create user (admin only)
router.post(
  '/',
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  asyncHandler(userController.create)
);

// Update user
router.put(
  '/:id',
  requirePermission(Permission.USER_UPDATE),
  asyncHandler(userController.update)
);

// Update user (PATCH alias for frontend compatibility)
router.patch(
  '/:id',
  requirePermission(Permission.USER_UPDATE),
  asyncHandler(userController.update)
);

// Change user role (admin only)
router.put(
  '/:id/role',
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  asyncHandler(userController.changeRole)
);

// Activate user (admin only)
router.put(
  '/:id/activate',
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  asyncHandler(userController.activate)
);

// Deactivate user (admin only)
router.put(
  '/:id/deactivate',
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  asyncHandler(userController.deactivate)
);

// Unlock user (admin only)
router.put(
  '/:id/unlock',
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  asyncHandler(userController.unlock)
);

// Delete (deactivate) user (admin only)
router.delete(
  '/:id',
  authorize(UserRole.SUPER_ADMIN),
  asyncHandler(userController.delete)
);

export default router;