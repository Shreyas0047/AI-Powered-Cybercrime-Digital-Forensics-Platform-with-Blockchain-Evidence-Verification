"use strict";
/**
 * Authentication Routes
 * /api/v1/auth
 * Public and protected endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const middleware_1 = require("../middleware");
const otp_service_1 = require("../services/otp.service");
const constants_1 = require("../constants");
const router = (0, express_1.Router)();
router.post('/send-otp', middleware_1.authLimiter, (0, middleware_1.asyncHandler)(async (req, res) => {
    const { email, role } = req.body;
    if (!email || !role) {
        res.status(400).json({ success: false, message: 'Email and role are required' });
        return;
    }
    if (!['analyst', 'admin'].includes(role)) {
        res.status(400).json({ success: false, message: 'Invalid role. Must be analyst or admin' });
        return;
    }
    const result = await (0, otp_service_1.sendOTP)(email, role);
    res.json(result);
}));
router.post('/verify-otp', middleware_1.authLimiter, (0, middleware_1.asyncHandler)(async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
        res.status(400).json({ success: false, message: 'Email and OTP are required' });
        return;
    }
    const result = (0, otp_service_1.verifyOTP)(email, otp);
    res.json(result);
}));
router.post('/register', middleware_1.authLimiter, (0, middleware_1.asyncHandler)(async (req, res) => {
    const { email, password, role, emailVerificationToken } = req.body;
    const normalizedRole = role === 'analyst' ? 'forensic_analyst' : role;
    if (!password || !constants_1.PASSWORD_REGEX.test(password)) {
        res.status(400).json({ success: false, message: constants_1.PASSWORD_ERROR });
        return;
    }
    if (!['admin', 'forensic_analyst'].includes(normalizedRole)) {
        res.status(400).json({
            success: false,
            message: 'Invalid role. Must be admin or forensic_analyst'
        });
        return;
    }
    const verification = (0, otp_service_1.consumeEmailVerification)(email, normalizedRole, emailVerificationToken);
    if (!verification.success) {
        res.status(403).json(verification);
        return;
    }
    req.body.role = normalizedRole;
    await controllers_1.authController.register(req, res);
}));
// Forgot / Reset password
router.post('/forgot-password', middleware_1.authLimiter, (0, middleware_1.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        res.status(400).json({ success: false, message: 'Email is required' });
        return;
    }
    await controllers_1.authController.forgotPassword(req, res);
}));
router.post('/verify-reset-otp', middleware_1.authLimiter, (0, middleware_1.asyncHandler)(async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
        res.status(400).json({ success: false, message: 'Email and OTP are required' });
        return;
    }
    await controllers_1.authController.verifyResetOtp(req, res);
}));
router.post('/reset-password', middleware_1.authLimiter, (0, middleware_1.asyncHandler)(async (req, res) => {
    const { email, password, confirmPassword, token } = req.body;
    if (!email || !password || !confirmPassword || !token) {
        res.status(400).json({ success: false, message: 'Email, password, confirm password, and token are required' });
        return;
    }
    await controllers_1.authController.resetPassword(req, res);
}));
// Apply rate limiting to login
router.post('/login', middleware_1.authLimiter, (0, middleware_1.asyncHandler)(controllers_1.authController.login));
router.post('/refresh', middleware_1.authLimiter, (0, middleware_1.asyncHandler)(controllers_1.authController.refresh));
// Protected routes
router.get('/me', middleware_1.authenticate, (0, middleware_1.asyncHandler)(controllers_1.authController.me));
router.post('/logout', middleware_1.authenticate, (0, middleware_1.asyncHandler)(controllers_1.authController.logout));
router.put('/password', middleware_1.authenticate, (0, middleware_1.asyncHandler)(controllers_1.authController.changePassword));
exports.default = router;
//# sourceMappingURL=auth.routes.js.map