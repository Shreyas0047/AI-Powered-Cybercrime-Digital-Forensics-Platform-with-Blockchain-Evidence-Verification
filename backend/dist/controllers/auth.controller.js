"use strict";
/**
 * Auth Controller
 * Handles authentication endpoints
 */
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
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
exports.default = exports.authController;
//# sourceMappingURL=auth.controller.js.map