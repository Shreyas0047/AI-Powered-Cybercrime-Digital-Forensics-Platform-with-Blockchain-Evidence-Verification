/**
 * Authentication & RBAC Middleware
 * Enterprise-grade authentication, authorization, and permission management
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, AuditLog } from '../models';
import { JwtPayload, UserRole, Permission, RolePermissions, AuditAction } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: any;
  userPayload?: JwtPayload;
}

// ============================================
// AUTHENTICATION
// ============================================

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        errors: [{ code: 'NO_TOKEN', message: 'No authentication token provided' }],
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret as string) as JwtPayload;

    // Fetch user from database
    const user: any = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Invalid or inactive user',
        errors: [{ code: 'INVALID_USER', message: 'User not found or inactive' }],
      });
      return;
    }

    req.user = user;
    req.userPayload = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired',
        errors: [{ code: 'TOKEN_EXPIRED', message: 'Authentication token has expired' }],
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: 'Invalid token',
      errors: [{ code: 'INVALID_TOKEN', message: 'Authentication token is invalid' }],
    });
  }
}

// ============================================
// ROLE-BASED AUTHORIZATION
// ============================================

/**
 * Role-based access control - allow specific roles
 */
export function authorize(...allowedRoles: Array<UserRole | string | Array<UserRole | string>>) {
  const normalizedAllowedRoles = allowedRoles
    .flat()
    .map((role) => normalizeRole(role));

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const userRole = normalizeRole(req.user.role as UserRole);
    if (!normalizedAllowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient role permissions',
        errors: [{ code: 'FORBIDDEN', message: 'You do not have permission to access this resource' }],
      });
      return;
    }

    next();
  };
}

function normalizeRole(role: UserRole | string): UserRole {
  if (role === 'analyst') {
    return UserRole.FORENSIC_ANALYST;
  }
  return role as UserRole;
}

export const authMiddleware = authenticate;
export const roleMiddleware = authorize;

/**
 * Permission-based access control - allow specific permissions
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

    const userRole = req.user.role as UserRole;
    const userPermissions = RolePermissions[userRole] || [];

    const hasAllPermissions = requiredPermissions.every(perm => userPermissions.includes(perm));

    if (!hasAllPermissions) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        errors: [{
          code: 'FORBIDDEN',
          message: `Required permissions: ${requiredPermissions.join(', ')}`,
        }],
      });
      return;
    }

    next();
  };
}

/**
 * Minimum role hierarchy level required
 */
export function requireMinRole(minRole: UserRole) {
  const minLevel = getRoleLevel(minRole);

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const userLevel = getRoleLevel(req.user.role as UserRole);

    if (userLevel < minLevel) {
      res.status(403).json({
        success: false,
        message: 'Insufficient role level',
        errors: [{
          code: 'FORBIDDEN',
          message: `Minimum required role: ${minRole}`,
        }],
      });
      return;
    }

    next();
  };
}

/**
 * Check if user can access specific resource based on ownership
 * For investigation/evidence that may be restricted to owner or admin
 */
export function canAccessResource(resourceOwnerId: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const userRole = req.user.role as UserRole;

    // Super admin and admin can access all
    if (userRole === UserRole.SUPER_ADMIN || userRole === UserRole.ADMIN) {
      next();
      return;
    }

    // Check if user owns the resource
    if (resourceOwnerId === req.user._id.toString()) {
      next();
      return;
    }

    // Check if user is assigned to the investigation
    if (req.user.assignedInvestigations?.includes(resourceOwnerId)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: 'Access denied to this resource',
      errors: [{ code: 'FORBIDDEN', message: 'You do not have access to this resource' }],
    });
  };
}

// ============================================
// OPTIONAL AUTHENTICATION
// ============================================

export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret as string) as JwtPayload;
    const user = await User.findById(decoded.userId);

    if (user && user.isActive) {
      req.user = user;
      req.userPayload = decoded;
    }
  } catch {
    // Ignore token errors for optional auth
  }

  next();
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getRoleLevel(role: UserRole): number {
  const levels: Record<UserRole, number> = {
    [UserRole.SUPER_ADMIN]: 100,
    [UserRole.ADMIN]: 80,
    [UserRole.FORENSIC_ANALYST]: 60,
    [UserRole.SECURITY_REVIEWER]: 40,
    [UserRole.SANDBOX_OPERATOR]: 20,
    [UserRole.AUDITOR]: 10,
  };
  return levels[role] || 0;
}

/**
 * Check if user has specific permission (utility function)
 */
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const permissions = RolePermissions[userRole] || [];
  return permissions.includes(permission);
}

/**
 * Get all permissions for a role (utility function)
 */
export function getPermissions(userRole: UserRole): Permission[] {
  return RolePermissions[userRole] || [];
}
