"use strict";
/**
 * Auth Controller
 * Handles authentication endpoints
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const services_1 = require("../services");
class AuthController {
    /**
     * POST /api/v1/auth/register
     * Register a new user
     */
    async register(req, res) {
        const { email, password, firstName, lastName, role } = req.body;
        const result = await services_1.authService.register({
            email,
            password,
            firstName,
            lastName,
            role: role,
            createdBy: req.user?.id || undefined,
        }, req.ip);
        const response = {
            success: true,
            message: 'User registered successfully',
            data: {
                user: result.user,
                tokens: result.tokens,
            },
        };
        res.status(201).json(response);
    }
    /**
     * POST /api/v1/auth/login
     * Login user
     */
    async login(req, res) {
        const { email, password } = req.body;
        const result = await services_1.authService.login(email, password, req.ip, req.headers['user-agent']);
        const response = {
            success: true,
            message: 'Login successful',
            data: {
                user: result.user,
                tokens: result.tokens,
            },
        };
        res.json(response);
    }
    /**
     * POST /api/v1/auth/refresh
     * Refresh access token
     */
    async refresh(req, res) {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400).json({
                success: false,
                message: 'Refresh token required',
            });
            return;
        }
        const tokens = await services_1.authService.refreshToken(refreshToken, req.ip);
        const response = {
            success: true,
            message: 'Token refreshed',
            data: { tokens },
        };
        res.json(response);
    }
    /**
     * POST /api/v1/auth/logout
     * Logout user
     */
    async logout(req, res) {
        if (req.user) {
            await services_1.authService.logout(req.user.id, req.ip);
        }
        const response = {
            success: true,
            message: 'Logout successful',
        };
        res.json(response);
    }
    /**
     * GET /api/v1/auth/me
     * Get current user
     */
    async me(req, res) {
        const response = {
            success: true,
            message: 'Current user retrieved',
            data: { user: req.user },
        };
        res.json(response);
    }
    /**
     * PUT /api/v1/auth/password
     * Change password
     */
    async changePassword(req, res) {
        const { currentPassword, newPassword } = req.body;
        await services_1.authService.changePassword(req.user.id, currentPassword, newPassword, req.ip);
        const response = {
            success: true,
            message: 'Password changed successfully',
        };
        res.json(response);
    }
    /**
     * POST /api/v1/auth/forgot-password
     * Request password reset OTP
     */
    async forgotPassword(req, res) {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ success: false, message: 'Email is required' });
            return;
        }
        const { sendPasswordResetOTP } = await Promise.resolve().then(() => __importStar(require('../services/otp.service')));
        const result = await sendPasswordResetOTP(email);
        res.json(result);
    }
    /**
     * POST /api/v1/auth/verify-reset-otp
     * Verify OTP for password reset
     */
    async verifyResetOtp(req, res) {
        const { email, otp } = req.body;
        if (!email || !otp) {
            res.status(400).json({ success: false, message: 'Email and OTP are required' });
            return;
        }
        const { verifyPasswordResetOTP } = await Promise.resolve().then(() => __importStar(require('../services/otp.service')));
        const result = verifyPasswordResetOTP(email, otp);
        res.json(result);
    }
    /**
     * POST /api/v1/auth/reset-password
     * Reset password after OTP verification
     */
    async resetPassword(req, res) {
        const { email, password, confirmPassword, token } = req.body;
        if (!email || !password || !confirmPassword || !token) {
            res.status(400).json({ success: false, message: 'Email, password, confirm password, and token are required' });
            return;
        }
        if (password !== confirmPassword) {
            res.status(400).json({ success: false, message: 'Passwords do not match' });
            return;
        }
        const { verifyPasswordResetToken } = await Promise.resolve().then(() => __importStar(require('../services/otp.service')));
        const decoded = verifyPasswordResetToken(token);
        if (!decoded) {
            res.status(403).json({ success: false, message: 'Invalid or expired reset token. Please verify OTP again.' });
            return;
        }
        if (decoded.email !== email.toLowerCase().trim()) {
            res.status(403).json({ success: false, message: 'Reset token does not match the provided email' });
            return;
        }
        await services_1.authService.resetPassword(email, password, req.ip);
        const response = {
            success: true,
            message: 'Password reset successfully. You can now login with your new password.',
        };
        res.json(response);
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
exports.default = exports.authController;
//# sourceMappingURL=auth.controller.js.map