/**
 * Role-Based Access Control (RBAC) - Permissions Definition
 * Defines granular permissions for the forensics platform
 */

import { Role } from './roles';

export enum Permission {
  // User Management
  USERS_VIEW = 'users:view',
  USERS_CREATE = 'users:create',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',
  USERS_MANAGE_ROLES = 'users:manage_roles',

  // Investigation Management
  INVESTIGATIONS_VIEW = 'investigations:view',
  INVESTIGATIONS_VIEW_ALL = 'investigations:view_all',
  INVESTIGATIONS_CREATE = 'investigations:create',
  INVESTIGATIONS_UPDATE = 'investigations:update',
  INVESTIGATIONS_DELETE = 'investigations:delete',
  INVESTIGATIONS_ARCHIVE = 'investigations:archive',

  // Evidence Management
  EVIDENCE_VIEW = 'evidence:view',
  EVIDENCE_VIEW_ALL = 'evidence:view_all',
  EVIDENCE_UPLOAD = 'evidence:upload',
  EVIDENCE_UPDATE = 'evidence:update',
  EVIDENCE_DELETE = 'evidence:delete',
  EVIDENCE_VERIFY = 'evidence:verify',

  // Alert Management
  ALERTS_VIEW = 'alerts:view',
  ALERTS_ACKNOWLEDGE = 'alerts:acknowledge',
  ALERTS_RESOLVE = 'alerts:resolve',

  // Sandbox Operations
  SANDBOX_VIEW = 'sandbox:view',
  SANDBOX_EXECUTE = 'sandbox:execute',
  SANDBOX_CONFIGURE = 'sandbox:configure',
  SANDBOX_MANAGE_VM = 'sandbox:manage_vm',

  // Telemetry & Analysis
  TELEMETRY_VIEW = 'telemetry:view',
  TELEMETRY_ANALYZE = 'telemetry:analyze',

  // Reports
  REPORTS_VIEW = 'reports:view',
  REPORTS_CREATE = 'reports:create',
  REPORTS_EXPORT = 'reports:export',
  REPORTS_DELETE = 'reports:delete',

  // Threat Intelligence
  THREAT_VIEW = 'threat:view',
  THREAT_CREATE = 'threat:create',
  THREAT_UPDATE = 'threat:update',
  THREAT_DELETE = 'threat:delete',

  // Blockchain
  BLOCKCHAIN_VIEW = 'blockchain:view',
  BLOCKCHAIN_VERIFY = 'blockchain:verify',
  BLOCKCHAIN_CONFIGURE = 'blockchain:configure',
  BLOCKCHAIN_RECONCILE = 'blockchain:reconcile',

  // Forensic Analytics
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',

  // System Configuration
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_UPDATE = 'settings:update',
  SETTINGS_SECURITY = 'settings:security',

  // Audit Logs
  AUDIT_VIEW = 'audit:view',
  AUDIT_EXPORT = 'audit:export',

  // System Health
  HEALTH_VIEW = 'health:view',
  HEALTH_MANAGE = 'health:manage',
}

export const PermissionLabels: Record<Permission, string> = {
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
export const RolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission), // Admin has all permissions

  [Role.ANALYST]: [
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
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = RolePermissions[role];
  return permissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

export default Permission;