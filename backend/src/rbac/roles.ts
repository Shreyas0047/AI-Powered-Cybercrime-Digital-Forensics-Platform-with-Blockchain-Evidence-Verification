/**
 * Role-Based Access Control (RBAC) - Roles Definition
 * Defines available roles for the forensics platform
 */

export enum Role {
  ADMIN = 'admin',
  ANALYST = 'analyst',
}

export const RoleLabels: Record<Role, string> = {
  [Role.ADMIN]: 'Administrator',
  [Role.ANALYST]: 'Analyst',
};

export const RoleDescriptions: Record<Role, string> = {
  [Role.ADMIN]: 'Full system access with administrative privileges',
  [Role.ANALYST]: 'Investigative access for forensic analysis and sandbox operations',
};

/**
 * Role hierarchy - higher index = more privileges
 */
export const RoleHierarchy: Record<Role, number> = {
  [Role.ANALYST]: 1,
  [Role.ADMIN]: 2,
};

/**
 * Check if a role has higher or equal privileges than another
 */
export function hasRoleOrHigher(userRole: Role, requiredRole: Role): boolean {
  return RoleHierarchy[userRole] >= RoleHierarchy[requiredRole];
}

/**
 * Check if user is an administrator
 */
export function isAdmin(role: Role): boolean {
  return role === Role.ADMIN;
}

/**
 * Check if user is an analyst
 */
export function isAnalyst(role: Role): boolean {
  return role === Role.ANALYST;
}

export default Role;