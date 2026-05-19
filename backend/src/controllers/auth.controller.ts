/**
 * Auth Controller
 * Handles authentication endpoints
 */

import { Response } from 'express';
import { authService } from '../services';
import { AuthenticatedRequest } from '../middleware';
import { ApiResponse, UserRole } from '../types';

export class AuthController {
  /**
   * POST /api/v1/auth/register
   * Register a new user
   */
  async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { email, password, firstName, lastName, role } = req.body;

    const result = await authService.register(
      {
        email,
        password,
        firstName,
        lastName,
        role: role as UserRole,
        createdBy: req.user?.id || undefined,
      },
      req.ip
    );

    const response: ApiResponse = {
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
  async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { email, password } = req.body;

    const result = await authService.login(
      email,
      password,
      req.ip,
      req.headers['user-agent']
    );

    const response: ApiResponse = {
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
  async refresh(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token required',
      });
      return;
    }

    const tokens = await authService.refreshToken(refreshToken, req.ip);

    const response: ApiResponse = {
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
  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (req.user) {
      await authService.logout(req.user.id, req.ip);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Logout successful',
    };

    res.json(response);
  }

  /**
   * GET /api/v1/auth/me
   * Get current user
   */
  async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    const response: ApiResponse = {
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
  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword,
      req.ip
    );

    const response: ApiResponse = {
      success: true,
      message: 'Password changed successfully',
    };

    res.json(response);
  }
}

export const authController = new AuthController();
export default authController;