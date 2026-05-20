"use strict";
/**
 * Authorization Middleware
 * Handles role-based and permission-based access control
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = void 0;
exports.authorize = authorize;
exports.requirePermission = requirePermission;
exports.requireAnyPermission = requireAnyPermission;
exports.requirePermissionForRole = requirePermissionForRole;
const roles_1 = require("../rbac/roles");
const permissions_1 = require("../rbac/permissions");
/**
 * Role authorization middleware factory
 * Checks if user has one of the specified roles
 */
function authorize(...allowedRoles) {
    return (req, res, next) => {
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
function requirePermission(...requiredPermissions) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }
        // Admin has all permissions
        if (req.user.role === roles_1.Role.ADMIN) {
            next();
            return;
        }
        // Check if user has all required permissions
        const hasRequired = (0, permissions_1.hasAllPermissions)(req.user.role, requiredPermissions);
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
function requireAnyPermission(...requiredPermissions) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }
        // Admin has all permissions
        if (req.user.role === roles_1.Role.ADMIN) {
            next();
            return;
        }
        const hasAny = (0, permissions_1.hasAnyPermission)(req.user.role, requiredPermissions);
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
exports.requireAdmin = authorize(roles_1.Role.ADMIN);
/**
 * Create permission-based authorization middleware
 */
function requirePermissionForRole(role, ...requiredPermissions) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }
        // Skip permission check for admin
        if (req.user.role === roles_1.Role.ADMIN) {
            next();
            return;
        }
        // Only check permissions for the specified role
        if (req.user.role === role) {
            const hasRequired = (0, permissions_1.hasAllPermissions)(req.user.role, requiredPermissions);
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
exports.default = {
    authorize,
    requirePermission,
    requireAnyPermission,
    requireAdmin: exports.requireAdmin,
    requirePermissionForRole,
};
//# sourceMappingURL=authorize.js.map