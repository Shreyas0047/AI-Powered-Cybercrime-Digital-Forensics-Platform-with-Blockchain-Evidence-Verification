/**
 * Authorization Middleware
 * Handles role-based and permission-based access control
 */

import { Request, Response, NextFunction } from 'express';
import { Role } from '../rbac/roles';
import { Permission, hasPermission, hasAnyPermission, hasAllPermissions } from '../rbac/permissions';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: Role;
    department?: string;
    permissions?: Permission[];
  };
}

/**
 * Role authorization middleware factory
 * Checks if user has one of the specified roles
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient privileges.',
        required: allowedRoles,
        current: req.user.role,
      });
      return;
    }

    next();
  };
}

/**
 * Permission authorization middleware factory
 * Checks if user has all specified permissions
 */
export function requirePermission(...requiredPermissions: Permission[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Admin has all permissions
    if (req.user.role === Role.ADMIN) {
      next();
      return;
    }

    // Check if user has all required permissions
    const hasRequired = hasAllPermissions(req.user.role, requiredPermissions);

    if (!hasRequired) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Missing required permissions.',
        required: requiredPermissions,
      });
      return;
    }

    next();
  };
}

/**
 * Require any of the specified permissions
 */
export function requireAnyPermission(...requiredPermissions: Permission[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Admin has all permissions
    if (req.user.role === Role.ADMIN) {
      next();
      return;
    }

    const hasAny = hasAnyPermission(req.user.role, requiredPermissions);

    if (!hasAny) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Missing required permissions.',
        required: requiredPermissions,
      });
      return;
    }

    next();
  };
}

/**
 * Admin-only middleware (convenience wrapper)
 */
export const requireAdmin = authorize(Role.ADMIN);

/**
 * Create permission-based authorization middleware
 */
export function requirePermissionForRole(role: Role, ...requiredPermissions: Permission[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Skip permission check for admin
    if (req.user.role === Role.ADMIN) {
      next();
      return;
    }

    // Only check permissions for the specified role
    if (req.user.role === role) {
      const hasRequired = hasAllPermissions(req.user.role, requiredPermissions);

      if (!hasRequired) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Missing required permissions.',
          required: requiredPermissions,
        });
        return;
      }
    }

    next();
  };
}

export default {
  authorize,
  requirePermission,
  requireAnyPermission,
  requireAdmin,
  requirePermissionForRole,
};