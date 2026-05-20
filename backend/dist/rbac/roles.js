"use strict";
/**
 * Role-Based Access Control (RBAC) - Roles Definition
 * Defines available roles for the forensics platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleHierarchy = exports.RoleDescriptions = exports.RoleLabels = exports.Role = void 0;
exports.hasRoleOrHigher = hasRoleOrHigher;
exports.isAdmin = isAdmin;
exports.isAnalyst = isAnalyst;
var Role;
(function (Role) {
    Role["ADMIN"] = "admin";
    Role["ANALYST"] = "analyst";
})(Role || (exports.Role = Role = {}));
exports.RoleLabels = {
    [Role.ADMIN]: 'Administrator',
    [Role.ANALYST]: 'Analyst',
};
exports.RoleDescriptions = {
    [Role.ADMIN]: 'Full system access with administrative privileges',
    [Role.ANALYST]: 'Investigative access for forensic analysis and sandbox operations',
};
/**
 * Role hierarchy - higher index = more privileges
 */
exports.RoleHierarchy = {
    [Role.ANALYST]: 1,
    [Role.ADMIN]: 2,
};
/**
 * Check if a role has higher or equal privileges than another
 */
function hasRoleOrHigher(userRole, requiredRole) {
    return exports.RoleHierarchy[userRole] >= exports.RoleHierarchy[requiredRole];
}
/**
 * Check if user is an administrator
 */
function isAdmin(role) {
    return role === Role.ADMIN;
}
/**
 * Check if user is an analyst
 */
function isAnalyst(role) {
    return role === Role.ANALYST;
}
exports.default = Role;
//# sourceMappingURL=roles.js.map