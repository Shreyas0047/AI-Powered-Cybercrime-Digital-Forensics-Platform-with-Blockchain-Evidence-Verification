"use strict";
/**
 * RBAC Index - Export all RBAC modules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasAllPermissions = exports.hasAnyPermission = exports.hasPermission = exports.RolePermissions = exports.PermissionLabels = exports.Permission = exports.isAnalyst = exports.isAdmin = exports.hasRoleOrHigher = exports.RoleHierarchy = exports.RoleDescriptions = exports.RoleLabels = exports.Role = void 0;
var roles_1 = require("./roles");
Object.defineProperty(exports, "Role", { enumerable: true, get: function () { return roles_1.Role; } });
Object.defineProperty(exports, "RoleLabels", { enumerable: true, get: function () { return roles_1.RoleLabels; } });
Object.defineProperty(exports, "RoleDescriptions", { enumerable: true, get: function () { return roles_1.RoleDescriptions; } });
Object.defineProperty(exports, "RoleHierarchy", { enumerable: true, get: function () { return roles_1.RoleHierarchy; } });
Object.defineProperty(exports, "hasRoleOrHigher", { enumerable: true, get: function () { return roles_1.hasRoleOrHigher; } });
Object.defineProperty(exports, "isAdmin", { enumerable: true, get: function () { return roles_1.isAdmin; } });
Object.defineProperty(exports, "isAnalyst", { enumerable: true, get: function () { return roles_1.isAnalyst; } });
var permissions_1 = require("./permissions");
Object.defineProperty(exports, "Permission", { enumerable: true, get: function () { return permissions_1.Permission; } });
Object.defineProperty(exports, "PermissionLabels", { enumerable: true, get: function () { return permissions_1.PermissionLabels; } });
Object.defineProperty(exports, "RolePermissions", { enumerable: true, get: function () { return permissions_1.RolePermissions; } });
Object.defineProperty(exports, "hasPermission", { enumerable: true, get: function () { return permissions_1.hasPermission; } });
Object.defineProperty(exports, "hasAnyPermission", { enumerable: true, get: function () { return permissions_1.hasAnyPermission; } });
Object.defineProperty(exports, "hasAllPermissions", { enumerable: true, get: function () { return permissions_1.hasAllPermissions; } });
//# sourceMappingURL=index.js.map