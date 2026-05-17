/**
 * Authentication Routes
 * /api/v1/auth
 * Public and protected endpoints
 */

import { Router } from 'express';
import { authController } from '../controllers';
import { authenticate, asyncHandler, authLimiter } from '../middleware';
import { securityLogger } from '../config/logger';

const router = Router();

// Apply rate limiting to login and register
router.post('/login', authLimiter, asyncHandler(authController.login));
router.post('/register', authLimiter, asyncHandler(authController.register));
router.post('/refresh', authLimiter, asyncHandler(authController.refresh));

// Protected routes
router.get('/me', authenticate, asyncHandler(authController.me));
router.post('/logout', authenticate, asyncHandler(authController.logout));
router.put('/password', authenticate, asyncHandler(authController.changePassword));

export default router;