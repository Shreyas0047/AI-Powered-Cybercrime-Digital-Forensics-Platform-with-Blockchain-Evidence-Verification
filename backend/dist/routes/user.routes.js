"use strict";
/**
 * User Routes
 * /api/v1/users
 * Protected routes for user management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const middleware_1 = require("../middleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(middleware_1.authenticate);
// Get current user profile
router.get('/me', (0, middleware_1.asyncHandler)(async (req, res) => {
    const response = {
        success: true,
        message: 'Current user retrieved',
        data: { user: req.user },
    };
    res.json(response);
}));
// Get user stats (admin only)
router.get('/stats', (0, middleware_1.authorize)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.ADMIN), (0, middleware_1.asyncHandler)(controllers_1.userController.getStats));
// Get all users (admin only)
router.get('/', (0, middleware_1.authorize)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.ADMIN), (0, middleware_1.asyncHandler)(controllers_1.userController.findAll));
// Get user by ID
router.get('/:id', (0, middleware_1.authorize)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.ADMIN), (0, middleware_1.asyncHandler)(controllers_1.userController.findById));
// Get user activity
router.get('/:id/activity', (0, middleware_1.authorize)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.ADMIN, types_1.UserRole.FORENSIC_ANALYST), (0, middleware_1.asyncHandler)(controllers_1.userController.getActivity));
// Create user (admin only)
router.post('/', (0, middleware_1.authorize)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.ADMIN), (0, middleware_1.asyncHandler)(controllers_1.userController.create));
// Update user
router.put('/:id', (0, middleware_1.requirePermission)(types_1.Permission.USER_UPDATE), (0, middleware_1.asyncHandler)(controllers_1.userController.update));
// Update user (PATCH alias for frontend compatibility)
router.patch('/:id', (0, middleware_1.requirePermission)(types_1.Permission.USER_UPDATE), (0, middleware_1.asyncHandler)(controllers_1.userController.update));
// Change user role (admin only)
router.put('/:id/role', (0, middleware_1.authorize)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.ADMIN), (0, middleware_1.asyncHandler)(controllers_1.userController.changeRole));
// Activate user (admin only)
router.put('/:id/activate', (0, middleware_1.authorize)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.ADMIN), (0, middleware_1.asyncHandler)(controllers_1.userController.activate));
// Deactivate user (admin only)
router.put('/:id/deactivate', (0, middleware_1.authorize)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.ADMIN), (0, middleware_1.asyncHandler)(controllers_1.userController.deactivate));
// Unlock user (admin only)
router.put('/:id/unlock', (0, middleware_1.authorize)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.ADMIN), (0, middleware_1.asyncHandler)(controllers_1.userController.unlock));
// Delete (deactivate) user (admin only)
router.delete('/:id', (0, middleware_1.authorize)(types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.userController.delete));
exports.default = router;
//# sourceMappingURL=user.routes.js.map