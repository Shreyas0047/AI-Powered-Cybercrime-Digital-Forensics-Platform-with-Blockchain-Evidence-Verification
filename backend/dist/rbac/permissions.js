"use strict";
/**
 * Role-Based Access Control (RBAC) - Permissions Definition
 * Defines granular permissions for the forensics platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolePermissions = exports.PermissionLabels = exports.Permission = void 0;
exports.hasPermission = hasPermission;
exports.hasAnyPermission = hasAnyPermission;
exports.hasAllPermissions = hasAllPermissions;
const roles_1 = require("./roles");
var Permission;
(function (Permission) {
    // User Management
    Permission["USERS_VIEW"] = "users:view";
    Permission["USERS_CREATE"] = "users:create";
    Permission["USERS_UPDATE"] = "users:update";
    Permission["USERS_DELETE"] = "users:delete";
    Permission["USERS_MANAGE_ROLES"] = "users:manage_roles";
    // Investigation Management
    Permission["INVESTIGATIONS_VIEW"] = "investigations:view";
    Permission["INVESTIGATIONS_VIEW_ALL"] = "investigations:view_all";
    Permission["INVESTIGATIONS_CREATE"] = "investigations:create";
    Permission["INVESTIGATIONS_UPDATE"] = "investigations:update";
    Permission["INVESTIGATIONS_DELETE"] = "investigations:delete";
    Permission["INVESTIGATIONS_ARCHIVE"] = "investigations:archive";
    // Evidence Management
    Permission["EVIDENCE_VIEW"] = "evidence:view";
    Permission["EVIDENCE_VIEW_ALL"] = "evidence:view_all";
    Permission["EVIDENCE_UPLOAD"] = "evidence:upload";
    Permission["EVIDENCE_UPDATE"] = "evidence:update";
    Permission["EVIDENCE_DELETE"] = "evidence:delete";
    Permission["EVIDENCE_VERIFY"] = "evidence:verify";
    // Alert Management
    Permission["ALERTS_VIEW"] = "alerts:view";
    Permission["ALERTS_ACKNOWLEDGE"] = "alerts:acknowledge";
    Permission["ALERTS_RESOLVE"] = "alerts:resolve";
    // Sandbox Operations
    Permission["SANDBOX_VIEW"] = "sandbox:view";
    Permission["SANDBOX_EXECUTE"] = "sandbox:execute";
    Permission["SANDBOX_CONFIGURE"] = "sandbox:configure";
    Permission["SANDBOX_MANAGE_VM"] = "sandbox:manage_vm";
    // Telemetry & Analysis
    Permission["TELEMETRY_VIEW"] = "telemetry:view";
    Permission["TELEMETRY_ANALYZE"] = "telemetry:analyze";
    // Reports
    Permission["REPORTS_VIEW"] = "reports:view";
    Permission["REPORTS_CREATE"] = "reports:create";
    Permission["REPORTS_EXPORT"] = "reports:export";
    Permission["REPORTS_DELETE"] = "reports:delete";
    // Threat Intelligence
    Permission["THREAT_VIEW"] = "threat:view";
    Permission["THREAT_CREATE"] = "threat:create";
    Permission["THREAT_UPDATE"] = "threat:update";
    Permission["THREAT_DELETE"] = "threat:delete";
    // Blockchain
    Permission["BLOCKCHAIN_VIEW"] = "blockchain:view";
    Permission["BLOCKCHAIN_VERIFY"] = "blockchain:verify";
    Permission["BLOCKCHAIN_CONFIGURE"] = "blockchain:configure";
    Permission["BLOCKCHAIN_RECONCILE"] = "blockchain:reconcile";
    // Forensic Analytics
    Permission["ANALYTICS_VIEW"] = "analytics:view";
    Permission["ANALYTICS_EXPORT"] = "analytics:export";
    // System Configuration
    Permission["SETTINGS_VIEW"] = "settings:view";
    Permission["SETTINGS_UPDATE"] = "settings:update";
    Permission["SETTINGS_SECURITY"] = "settings:security";
    // Audit Logs
    Permission["AUDIT_VIEW"] = "audit:view";
    Permission["AUDIT_EXPORT"] = "audit:export";
    // System Health
    Permission["HEALTH_VIEW"] = "health:view";
    Permission["HEALTH_MANAGE"] = "health:manage";
})(Permission || (exports.Permission = Permission = {}));
exports.PermissionLabels = {
    [Permission.USERS_VIEW]: 'View Users',
    [Permission.USERS_CREATE]: 'Create Users',
    [Permission.USERS_UPDATE]: 'Update Users',
    [Permission.USERS_DELETE]: 'Delete Users',
    [Permission.USERS_MANAGE_ROLES]: 'Manage User Roles',
    [Permission.INVESTIGATIONS_VIEW]: 'View Investigations',
    [Permission.INVESTIGATIONS_VIEW_ALL]: 'View All Investigations',
    [Permission.INVESTIGATIONS_CREATE]: 'Create Investigations',
    [Permission.INVESTIGATIONS_UPDATE]: 'Update Investigations',
    [Permission.INVESTIGATIONS_DELETE]: 'Delete Investigations',
    [Permission.INVESTIGATIONS_ARCHIVE]: 'Archive Investigations',
    [Permission.EVIDENCE_VIEW]: 'View Evidence',
    [Permission.EVIDENCE_VIEW_ALL]: 'View All Evidence',
    [Permission.EVIDENCE_UPLOAD]: 'Upload Evidence',
    [Permission.EVIDENCE_UPDATE]: 'Update Evidence',
    [Permission.EVIDENCE_DELETE]: 'Delete Evidence',
    [Permission.EVIDENCE_VERIFY]: 'Verify Evidence',
    [Permission.ALERTS_VIEW]: 'View Alerts',
    [Permission.ALERTS_ACKNOWLEDGE]: 'Acknowledge Alerts',
    [Permission.ALERTS_RESOLVE]: 'Resolve Alerts',
    [Permission.SANDBOX_VIEW]: 'View Sandbox',
    [Permission.SANDBOX_EXECUTE]: 'Execute Simulations',
    [Permission.SANDBOX_CONFIGURE]: 'Configure Sandbox',
    [Permission.SANDBOX_MANAGE_VM]: 'Manage VM Settings',
    [Permission.TELEMETRY_VIEW]: 'View Telemetry',
    [Permission.TELEMETRY_ANALYZE]: 'Analyze Telemetry',
    [Permission.REPORTS_VIEW]: 'View Reports',
    [Permission.REPORTS_CREATE]: 'Create Reports',
    [Permission.REPORTS_EXPORT]: 'Export Reports',
    [Permission.REPORTS_DELETE]: 'Delete Reports',
    [Permission.THREAT_VIEW]: 'View Threat Intel',
    [Permission.THREAT_CREATE]: 'Create Threat Intel',
    [Permission.THREAT_UPDATE]: 'Update Threat Intel',
    [Permission.THREAT_DELETE]: 'Delete Threat Intel',
    [Permission.BLOCKCHAIN_VIEW]: 'View Blockchain',
    [Permission.BLOCKCHAIN_VERIFY]: 'Verify on Blockchain',
    [Permission.BLOCKCHAIN_CONFIGURE]: 'Configure Blockchain',
    [Permission.BLOCKCHAIN_RECONCILE]: 'Run Reconciliation',
    [Permission.ANALYTICS_VIEW]: 'View Analytics',
    [Permission.ANALYTICS_EXPORT]: 'Export Analytics',
    [Permission.SETTINGS_VIEW]: 'View Settings',
    [Permission.SETTINGS_UPDATE]: 'Update Settings',
    [Permission.SETTINGS_SECURITY]: 'Security Settings',
    [Permission.AUDIT_VIEW]: 'View Audit Logs',
    [Permission.AUDIT_EXPORT]: 'Export Audit Logs',
    [Permission.HEALTH_VIEW]: 'View System Health',
    [Permission.HEALTH_MANAGE]: 'Manage System Health',
};
/**
 * Default permissions for each role
 */
exports.RolePermissions = {
    [roles_1.Role.ADMIN]: Object.values(Permission), // Admin has all permissions
    [roles_1.Role.ANALYST]: [
        // Investigations
        Permission.INVESTIGATIONS_VIEW,
        Permission.INVESTIGATIONS_CREATE,
        Permission.INVESTIGATIONS_UPDATE,
        // Evidence
        Permission.EVIDENCE_VIEW,
        Permission.EVIDENCE_UPLOAD,
        Permission.EVIDENCE_UPDATE,
        Permission.EVIDENCE_VERIFY,
        // Alerts
        Permission.ALERTS_VIEW,
        Permission.ALERTS_ACKNOWLEDGE,
        Permission.ALERTS_RESOLVE,
        // Sandbox
        Permission.SANDBOX_VIEW,
        Permission.SANDBOX_EXECUTE,
        // Telemetry
        Permission.TELEMETRY_VIEW,
        Permission.TELEMETRY_ANALYZE,
        // Reports
        Permission.REPORTS_VIEW,
        Permission.REPORTS_CREATE,
        Permission.REPORTS_EXPORT,
        // Threat Intelligence
        Permission.THREAT_VIEW,
        Permission.THREAT_CREATE,
        Permission.THREAT_UPDATE,
        // Blockchain
        Permission.BLOCKCHAIN_VIEW,
        Permission.BLOCKCHAIN_VERIFY,
        // Analytics
        Permission.ANALYTICS_VIEW,
        Permission.ANALYTICS_EXPORT,
    ],
};
/**
 * Check if a role has a specific permission
 */
function hasPermission(role, permission) {
    const permissions = exports.RolePermissions[role];
    return permissions.includes(permission);
}
/**
 * Check if a role has any of the specified permissions
 */
function hasAnyPermission(role, permissions) {
    return permissions.some(permission => hasPermission(role, permission));
}
/**
 * Check if a role has all of the specified permissions
 */
function hasAllPermissions(role, permissions) {
    return permissions.every(permission => hasPermission(role, permission));
}
exports.default = Permission;
//# sourceMappingURL=permissions.js.map