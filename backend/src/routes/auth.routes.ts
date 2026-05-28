/**
 * Authentication Routes
 * /api/v1/auth
 * Public and protected endpoints
 */

import { Router } from 'express';
import { authController } from '../controllers';
import { authenticate, asyncHandler, authLimiter } from '../middleware';
import { consumeEmailVerification, sendOTP, verifyOTP } from '../services/otp.service';
import { PASSWORD_REGEX, PASSWORD_ERROR } from '../constants';

const router = Router();

router.post('/send-otp', authLimiter, asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  
  if (!email || !role) {
    res.status(400).json({ success: false, message: 'Email and role are required' });
    return;
  }

  if (!['analyst', 'admin'].includes(role)) {
    res.status(400).json({ success: false, message: 'Invalid role. Must be analyst or admin' });
    return;
  }

  const result = await sendOTP(email, role);
  res.json(result);
}));

router.post('/verify-otp', authLimiter, asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  
  if (!email || !otp) {
    res.status(400).json({ success: false, message: 'Email and OTP are required' });
    return;
  }

  const result = verifyOTP(email, otp);
  res.json(result);
}));

router.post('/register', authLimiter, asyncHandler(async (req, res) => {
  const { email, password, role, emailVerificationToken } = req.body;
  const normalizedRole = role === 'analyst' ? 'forensic_analyst' : role;

  if (!password || !PASSWORD_REGEX.test(password)) {
    res.status(400).json({ success: false, message: PASSWORD_ERROR });
    return;
  }

  if (!['admin', 'forensic_analyst'].includes(normalizedRole)) {
    res.status(400).json({
      success: false,
      message: 'Invalid role. Must be admin or forensic_analyst'
    });
    return;
  }

  const verification = consumeEmailVerification(email, normalizedRole, emailVerificationToken);
  if (!verification.success) {
    res.status(403).json(verification);
    return;
  }

  req.body.role = normalizedRole;
  await authController.register(req, res);
}));

// Forgot / Reset password
router.post('/forgot-password', authLimiter, asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ success: false, message: 'Email is required' });
    return;
  }

  await authController.forgotPassword(req, res);
}));

router.post('/verify-reset-otp', authLimiter, asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    res.status(400).json({ success: false, message: 'Email and OTP are required' });
    return;
  }

  await authController.verifyResetOtp(req, res);
}));

router.post('/reset-password', authLimiter, asyncHandler(async (req, res) => {
  const { email, password, confirmPassword, token } = req.body;

  if (!email || !password || !confirmPassword || !token) {
    res.status(400).json({ success: false, message: 'Email, password, confirm password, and token are required' });
    return;
  }

  await authController.resetPassword(req, res);
}));

// Apply rate limiting to login
router.post('/login', authLimiter, asyncHandler(authController.login));
router.post('/refresh', authLimiter, asyncHandler(authController.refresh));

// Protected routes
router.get('/me', authenticate, asyncHandler(authController.me));
router.post('/logout', authenticate, asyncHandler(authController.logout));
router.put('/password', authenticate, asyncHandler(authController.changePassword));

export default router;
