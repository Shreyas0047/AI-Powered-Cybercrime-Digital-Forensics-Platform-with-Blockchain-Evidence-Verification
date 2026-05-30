"use strict";
/**
 * Authentication Service - Enterprise Security Enhanced
 * Complete authentication with JWT, audit logging, and security features
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = require("mongoose");
const config_1 = require("../config");
const logger_1 = __importDefault(require("../config/logger"));
const logger_2 = require("../config/logger");
const models_1 = require("../models");
const types_1 = require("../types");
const middleware_1 = require("../middleware");
const constants_1 = require("../constants");
class AuthService {
    /**
     * Register a new user
     */
    async register(data, ipAddress) {
        // Check if user exists
        const existingUser = await models_1.User.findOne({ email: data.email.toLowerCase() });
        if (existingUser) {
            throw new middleware_1.ValidationError('Email already registered', [
                { field: 'email', message: 'A user with this email already exists' },
            ]);
        }
        // Validate password strength
        if (!constants_1.PASSWORD_REGEX.test(data.password)) {
            throw new middleware_1.ValidationError(constants_1.PASSWORD_ERROR, [
                { field: 'password', message: constants_1.PASSWORD_ERROR },
            ]);
        }
        // Validate role assignment permissions
        if (data.role && data.createdBy && mongoose_1.Types.ObjectId.isValid(data.createdBy)) {
            const creator = await models_1.User.findById(data.createdBy);
            if (creator && !creator.canAssignRole(data.role)) {
                throw new middleware_1.ForbiddenError('Insufficient permissions to assign this role');
            }
        }
        // Create user
        const user = await models_1.User.create({
            email: data.email.toLowerCase(),
            password: data.password,
            firstName: data.firstName,
            lastName: data.lastName,
            role: data.role || types_1.UserRole.AUDITOR,
            createdBy: data.createdBy,
        });
        // Audit log
        await models_1.AuditLog.log({
            userId: data.createdBy || user._id.toString(),
            action: types_1.AuditAction.USER_CREATE,
            entityType: 'User',
            entityId: user._id.toString(),
            ipAddress,
            status: 'success',
            details: { email: user.email, role: user.role },
        });
        // Generate tokens
        const tokens = this.generateTokens(user);
        logger_1.default.info(`User registered: ${user.email} with role ${user.role}`);
        return { user, tokens };
    }
    /**
     * Login with email and password
     */
    async login(email, password, ipAddress, userAgent) {
        // Validate inputs
        if (!email || !password) {
            throw new middleware_1.UnauthorizedError('Email and password are required');
        }
        // Find user with password
        const normalizedEmail = email.toLowerCase();
        const user = await models_1.User.findOne({ email: normalizedEmail }).select('+password');
        if (!user) {
            // Log failed attempt
            logger_2.securityLogger.warn({
                message: 'Failed login attempt - user not found',
                email: normalizedEmail,
                ipAddress,
            });
            await models_1.AuditLog.log({
                action: types_1.AuditAction.LOGIN_FAILED,
                entityType: 'User',
                ipAddress,
                userAgent,
                status: 'failed',
                errorMessage: 'User not found',
                details: { email: normalizedEmail },
            });
            throw new middleware_1.UnauthorizedError('Invalid email or password');
        }
        // Check if account is locked
        if (user.isLocked && user.lockedUntil && new Date() < user.lockedUntil) {
            const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
            logger_2.securityLogger.warn({
                message: 'Login attempt on locked account',
                email: user.email,
                ipAddress,
                lockedUntil: user.lockedUntil,
            });
            await models_1.AuditLog.log({
                userId: user._id.toString(),
                action: types_1.AuditAction.LOGIN_FAILED,
                entityType: 'User',
                ipAddress,
                userAgent,
                status: 'failed',
                errorMessage: 'Account locked',
                details: { reason: 'Too many failed attempts', lockedUntil: user.lockedUntil },
            });
            throw new middleware_1.UnauthorizedError(`Account is locked. Try again in ${remainingMinutes} minutes`);
        }
        // Verify password
        const isValid = await user.comparePassword(password);
        if (!isValid) {
            await user.incrementFailedLogin();
            logger_2.securityLogger.warn({
                message: 'Failed login attempt - invalid password',
                email: user.email,
                ipAddress,
                failedAttempts: user.failedLoginAttempts,
            });
            await models_1.AuditLog.log({
                userId: user._id.toString(),
                action: types_1.AuditAction.LOGIN_FAILED,
                entityType: 'User',
                ipAddress,
                userAgent,
                status: 'failed',
                errorMessage: 'Invalid password',
                details: { failedAttempts: user.failedLoginAttempts },
            });
            throw new middleware_1.UnauthorizedError('Invalid email or password');
        }
        // Check if account is active
        if (!user.isActive) {
            logger_2.securityLogger.warn({
                message: 'Login attempt on inactive account',
                email: user.email,
                ipAddress,
            });
            await models_1.AuditLog.log({
                userId: user._id.toString(),
                action: types_1.AuditAction.LOGIN_FAILED,
                entityType: 'User',
                ipAddress,
                userAgent,
                status: 'failed',
                errorMessage: 'Account inactive',
            });
            throw new middleware_1.UnauthorizedError('Account is inactive');
        }
        // Check password expiry
        if (user.mustChangePassword) {
            // Allow login but require password change - return special token
            const tokens = this.generateTokens(user);
            user.lastLoginIp = ipAddress;
            await user.save();
            await models_1.AuditLog.log({
                userId: user._id.toString(),
                action: types_1.AuditAction.LOGIN,
                entityType: 'User',
                ipAddress,
                userAgent,
                status: 'success',
                details: { passwordChangeRequired: true },
            });
            return { user, tokens };
        }
        // Reset failed login attempts and update last login
        user.lastLoginIp = ipAddress;
        await user.resetFailedLogin();
        // Generate tokens
        const tokens = this.generateTokens(user);
        // Audit successful login
        await models_1.AuditLog.log({
            userId: user._id.toString(),
            action: types_1.AuditAction.LOGIN,
            entityType: 'User',
            ipAddress,
            userAgent,
            status: 'success',
        });
        logger_1.default.info(`User logged in: ${user.email} from ${ipAddress}`);
        return { user, tokens };
    }
    /**
     * Refresh access token
     */
    async refreshToken(refreshToken, ipAddress) {
        try {
            const decoded = jsonwebtoken_1.default.verify(refreshToken, config_1.config.jwt.refreshSecret);
            const user = await models_1.User.findById(decoded.userId);
            if (!user || !user.isActive) {
                throw new middleware_1.UnauthorizedError('Invalid refresh token');
            }
            const tokens = this.generateTokens(user);
            // Audit token refresh
            await models_1.AuditLog.log({
                userId: user._id.toString(),
                action: types_1.AuditAction.TOKEN_REFRESH,
                entityType: 'User',
                ipAddress,
                status: 'success',
            });
            return tokens;
        }
        catch (error) {
            await models_1.AuditLog.log({
                action: types_1.AuditAction.TOKEN_REFRESH,
                ipAddress,
                status: 'failed',
                errorMessage: 'Invalid or expired refresh token',
            });
            throw new middleware_1.UnauthorizedError('Invalid or expired refresh token');
        }
    }
    /**
     * Logout
     */
    async logout(userId, ipAddress) {
        await models_1.AuditLog.log({
            userId,
            action: types_1.AuditAction.LOGOUT,
            entityType: 'User',
            ipAddress,
            status: 'success',
        });
        logger_1.default.info(`User logged out: ${userId}`);
    }
    /**
     * Change password
     */
    async changePassword(userId, currentPassword, newPassword, ipAddress) {
        const user = await models_1.User.findById(userId).select('+password');
        if (!user) {
            throw new middleware_1.UnauthorizedError('User not found');
        }
        // Verify current password
        const isValid = await user.comparePassword(currentPassword);
        if (!isValid) {
            await models_1.AuditLog.log({
                userId,
                action: types_1.AuditAction.PASSWORD_CHANGE,
                entityType: 'User',
                ipAddress,
                status: 'failed',
                errorMessage: 'Current password incorrect',
            });
            throw new middleware_1.UnauthorizedError('Current password is incorrect');
        }
        // Validate new password
        if (!constants_1.PASSWORD_REGEX.test(newPassword)) {
            throw new middleware_1.ValidationError(constants_1.PASSWORD_ERROR, [
                { field: 'newPassword', message: constants_1.PASSWORD_ERROR },
            ]);
        }
        // Update password
        user.password = newPassword;
        user.mustChangePassword = false;
        user.failedLoginAttempts = 0;
        await user.save();
        await models_1.AuditLog.log({
            userId: user._id.toString(),
            action: types_1.AuditAction.PASSWORD_CHANGE,
            entityType: 'User',
            ipAddress,
            status: 'success',
        });
        logger_1.default.info(`Password changed for user: ${userId}`);
    }
    /**
     * Reset password (forgot password flow)
     */
    async resetPassword(email, newPassword, ipAddress) {
        const normalizedEmail = email.toLowerCase();
        const user = await models_1.User.findOne({ email: normalizedEmail }).select('+password');
        if (!user) {
            throw new middleware_1.UnauthorizedError('Invalid reset request');
        }
        if (!user.isActive) {
            throw new middleware_1.UnauthorizedError('Account is inactive');
        }
        if (!constants_1.PASSWORD_REGEX.test(newPassword)) {
            throw new middleware_1.ValidationError(constants_1.PASSWORD_ERROR, [
                { field: 'newPassword', message: constants_1.PASSWORD_ERROR },
            ]);
        }
        user.password = newPassword;
        user.mustChangePassword = false;
        user.failedLoginAttempts = 0;
        await user.save();
        await models_1.AuditLog.log({
            userId: user._id.toString(),
            action: types_1.AuditAction.PASSWORD_RESET_COMPLETE,
            entityType: 'User',
            ipAddress,
            status: 'success',
        });
        logger_1.default.info(`Password reset completed for user: ${normalizedEmail}`);
    }
    /**
     * Generate JWT tokens
     */
    generateTokens(user) {
        const payload = {
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        };
        const accessToken = jsonwebtoken_1.default.sign(payload, config_1.config.jwt.secret, {
            expiresIn: config_1.config.jwt.expiry,
            issuer: 'nyxtrace',
        });
        const refreshToken = jsonwebtoken_1.default.sign(payload, config_1.config.jwt.refreshSecret, {
            expiresIn: config_1.config.jwt.refreshExpiry,
            issuer: 'nyxtrace',
        });
        return { accessToken, refreshToken };
    }
    /**
     * Check if user has permission
     */
    hasPermission(userRole, permission) {
        const permissions = types_1.RolePermissions[userRole];
        return permissions.includes(permission);
    }
    /**
     * Validate token
     */
    validateToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
        }
        catch {
            return null;
        }
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
exports.default = exports.authService;
//# sourceMappingURL=auth.service.js.map