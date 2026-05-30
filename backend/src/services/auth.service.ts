/**
 * Authentication Service - Enterprise Security Enhanced
 * Complete authentication with JWT, audit logging, and security features
 */

import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { config } from '../config';
import logger from '../config/logger';
import { securityLogger } from '../config/logger';
import { User, AuditLog } from '../models';
import { JwtPayload, AuthTokens, UserRole, AuditAction, Permission, RolePermissions } from '../types';
import { UnauthorizedError, ForbiddenError, ValidationError } from '../middleware';
import { PASSWORD_REGEX, PASSWORD_ERROR } from '../constants';

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
    createdBy?: string;
  }, ipAddress?: string): Promise<{ user: any; tokens: AuthTokens }> {
    // Check if user exists
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      throw new ValidationError('Email already registered', [
        { field: 'email', message: 'A user with this email already exists' },
      ]);
    }

    // Validate password strength
    if (!PASSWORD_REGEX.test(data.password)) {
      throw new ValidationError(PASSWORD_ERROR, [
        { field: 'password', message: PASSWORD_ERROR },
      ]);
    }

    // Validate role assignment permissions
    if (data.role && data.createdBy && Types.ObjectId.isValid(data.createdBy)) {
      const creator: any = await User.findById(data.createdBy);
      if (creator && !creator.canAssignRole(data.role)) {
        throw new ForbiddenError('Insufficient permissions to assign this role');
      }
    }

    // Create user
    const user = await User.create({
      email: data.email.toLowerCase(),
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role || UserRole.AUDITOR,
      createdBy: data.createdBy,
    });

    // Audit log
    await (AuditLog as any).log({
      userId: data.createdBy || user._id.toString(),
      action: AuditAction.USER_CREATE,
      entityType: 'User',
      entityId: user._id.toString(),
      ipAddress,
      status: 'success',
      details: { email: user.email, role: user.role },
    });

    // Generate tokens
    const tokens = this.generateTokens(user);

    logger.info(`User registered: ${user.email} with role ${user.role}`);
    return { user, tokens };
  }

  /**
   * Login with email and password
   */
  async login(email?: string, password?: string, ipAddress?: string, userAgent?: string): Promise<{ user: any; tokens: AuthTokens }> {
    // Validate inputs
    if (!email || !password) {
      throw new UnauthorizedError('Email and password are required');
    }

    // Find user with password
    const normalizedEmail = email.toLowerCase();
    const user: any = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      // Log failed attempt
      securityLogger.warn({
        message: 'Failed login attempt - user not found',
        email: normalizedEmail,
        ipAddress,
      });
      await (AuditLog as any).log({
        action: AuditAction.LOGIN_FAILED,
        entityType: 'User',
        ipAddress,
        userAgent,
        status: 'failed',
        errorMessage: 'User not found',
        details: { email: normalizedEmail },
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if account is locked
    if (user.isLocked && user.lockedUntil && new Date() < user.lockedUntil) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      securityLogger.warn({
        message: 'Login attempt on locked account',
        email: user.email,
        ipAddress,
        lockedUntil: user.lockedUntil,
      });
      await (AuditLog as any).log({
        userId: user._id.toString(),
        action: AuditAction.LOGIN_FAILED,
        entityType: 'User',
        ipAddress,
        userAgent,
        status: 'failed',
        errorMessage: 'Account locked',
        details: { reason: 'Too many failed attempts', lockedUntil: user.lockedUntil },
      });
      throw new UnauthorizedError(`Account is locked. Try again in ${remainingMinutes} minutes`);
    }

    // Verify password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      await user.incrementFailedLogin();

      securityLogger.warn({
        message: 'Failed login attempt - invalid password',
        email: user.email,
        ipAddress,
        failedAttempts: user.failedLoginAttempts,
      });
      await (AuditLog as any).log({
        userId: user._id.toString(),
        action: AuditAction.LOGIN_FAILED,
        entityType: 'User',
        ipAddress,
        userAgent,
        status: 'failed',
        errorMessage: 'Invalid password',
        details: { failedAttempts: user.failedLoginAttempts },
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if account is active
    if (!user.isActive) {
      securityLogger.warn({
        message: 'Login attempt on inactive account',
        email: user.email,
        ipAddress,
      });
      await (AuditLog as any).log({
        userId: user._id.toString(),
        action: AuditAction.LOGIN_FAILED,
        entityType: 'User',
        ipAddress,
        userAgent,
        status: 'failed',
        errorMessage: 'Account inactive',
      });
      throw new UnauthorizedError('Account is inactive');
    }

    // Check password expiry
    if (user.mustChangePassword) {
      // Allow login but require password change - return special token
      const tokens = this.generateTokens(user);
      user.lastLoginIp = ipAddress;
      await user.save();

      await (AuditLog as any).log({
        userId: user._id.toString(),
        action: AuditAction.LOGIN,
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
    await (AuditLog as any).log({
      userId: user._id.toString(),
      action: AuditAction.LOGIN,
      entityType: 'User',
      ipAddress,
      userAgent,
      status: 'success',
    });

    logger.info(`User logged in: ${user.email} from ${ipAddress}`);
    return { user, tokens };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string, ipAddress?: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as JwtPayload;
      const user: any = await User.findById(decoded.userId);

      if (!user || !user.isActive) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      const tokens = this.generateTokens(user);

      // Audit token refresh
      await (AuditLog as any).log({
        userId: user._id.toString(),
        action: AuditAction.TOKEN_REFRESH,
        entityType: 'User',
        ipAddress,
        status: 'success',
      });

      return tokens;
    } catch (error) {
      await (AuditLog as any).log({
        action: AuditAction.TOKEN_REFRESH,
        ipAddress,
        status: 'failed',
        errorMessage: 'Invalid or expired refresh token',
      });
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  /**
   * Logout
   */
  async logout(userId: string, ipAddress?: string): Promise<void> {
    await (AuditLog as any).log({
      userId,
      action: AuditAction.LOGOUT,
      entityType: 'User',
      ipAddress,
      status: 'success',
    });
    logger.info(`User logged out: ${userId}`);
  }

  /**
   * Change password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string, ipAddress?: string): Promise<void> {
    const user: any = await User.findById(userId).select('+password');

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Verify current password
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      await (AuditLog as any).log({
        userId,
        action: AuditAction.PASSWORD_CHANGE,
        entityType: 'User',
        ipAddress,
        status: 'failed',
        errorMessage: 'Current password incorrect',
      });
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Validate new password
    if (!PASSWORD_REGEX.test(newPassword)) {
      throw new ValidationError(PASSWORD_ERROR, [
        { field: 'newPassword', message: PASSWORD_ERROR },
      ]);
    }

    // Update password
    user.password = newPassword;
    user.mustChangePassword = false;
    user.failedLoginAttempts = 0;
    await user.save();

    await (AuditLog as any).log({
      userId: user._id.toString(),
      action: AuditAction.PASSWORD_CHANGE,
      entityType: 'User',
      ipAddress,
      status: 'success',
    });

    logger.info(`Password changed for user: ${userId}`);
  }

  /**
   * Reset password (forgot password flow)
   */
  async resetPassword(email: string, newPassword: string, ipAddress?: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const user: any = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      throw new UnauthorizedError('Invalid reset request');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      throw new ValidationError(PASSWORD_ERROR, [
        { field: 'newPassword', message: PASSWORD_ERROR },
      ]);
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    user.failedLoginAttempts = 0;
    await user.save();

    await (AuditLog as any).log({
      userId: user._id.toString(),
      action: AuditAction.PASSWORD_RESET_COMPLETE,
      entityType: 'User',
      ipAddress,
      status: 'success',
    });

    logger.info(`Password reset completed for user: ${normalizedEmail}`);
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(user: any): AuthTokens {
    const payload: JwtPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret as string, {
      expiresIn: config.jwt.expiry,
      issuer: 'nyxtrace',
    } as any);

    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret as string, {
      expiresIn: config.jwt.refreshExpiry,
      issuer: 'nyxtrace',
    } as any);

    return { accessToken, refreshToken };
  }

  /**
   * Check if user has permission
   */
  hasPermission(userRole: UserRole, permission: Permission): boolean {
    const permissions = RolePermissions[userRole];
    return permissions.includes(permission);
  }

  /**
   * Validate token
   */
  validateToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
export default authService;
