"use strict";
/**
 * Authentication & RBAC Middleware
 * Enterprise-grade authentication, authorization, and permission management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleMiddleware = exports.authMiddleware = void 0;
exports.authenticate = authenticate;
exports.authorize = authorize;
exports.requirePermission = requirePermission;
exports.requireMinRole = requireMinRole;
exports.canAccessResource = canAccessResource;
exports.optionalAuth = optionalAuth;
exports.hasPermission = hasPermission;
exports.getPermissions = getPermissions;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const models_1 = require("../models");
const types_1 = require("../types");
// ============================================
// AUTHENTICATION
// ============================================
async function authenticate(req, res, next) {
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
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
        // Fetch user from database
        const user = await models_1.User.findById(decoded.userId);
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
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
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
function authorize(...allowedRoles) {
    const normalizedAllowedRoles = allowedRoles
        .flat()
        .map((role) => normalizeRole(role));
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }
        const userRole = normalizeRole(req.user.role);
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
function normalizeRole(role) {
    const validRoles = Object.values(types_1.UserRole);
    if (validRoles.includes(role)) {
        return role;
    }
    // No silent aliases — reject unknown roles
    return role;
}
exports.authMiddleware = authenticate;
exports.roleMiddleware = authorize;
/**
 * Permission-based access control - allow specific permissions
 */
function requirePermission(...requiredPermissions) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }
        const userRole = req.user.role;
        const userPermissions = types_1.RolePermissions[userRole] || [];
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
function requireMinRole(minRole) {
    const minLevel = getRoleLevel(minRole);
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }
        const userLevel = getRoleLevel(req.user.role);
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
function canAccessResource(resourceOwnerId) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }
        const userRole = req.user.role;
        // Super admin and admin can access all
        if (userRole === types_1.UserRole.SUPER_ADMIN || userRole === types_1.UserRole.ADMIN) {
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
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
        const user = await models_1.User.findById(decoded.userId);
        if (user && user.isActive) {
            req.user = user;
            req.userPayload = decoded;
        }
    }
    catch {
        // Ignore token errors for optional auth
    }
    next();
}
// ============================================
// HELPER FUNCTIONS
// ============================================
function getRoleLevel(role) {
    const levels = {
        [types_1.UserRole.SUPER_ADMIN]: 100,
        [types_1.UserRole.ADMIN]: 80,
        [types_1.UserRole.FORENSIC_ANALYST]: 60,
        [types_1.UserRole.SECURITY_REVIEWER]: 40,
        [types_1.UserRole.SANDBOX_OPERATOR]: 20,
        [types_1.UserRole.AUDITOR]: 10,
    };
    return levels[role] || 0;
}
/**
 * Check if user has specific permission (utility function)
 */
function hasPermission(userRole, permission) {
    const permissions = types_1.RolePermissions[userRole] || [];
    return permissions.includes(permission);
}
/**
 * Get all permissions for a role (utility function)
 */
function getPermissions(userRole) {
    return types_1.RolePermissions[userRole] || [];
}
//# sourceMappingURL=auth.middleware.js.map