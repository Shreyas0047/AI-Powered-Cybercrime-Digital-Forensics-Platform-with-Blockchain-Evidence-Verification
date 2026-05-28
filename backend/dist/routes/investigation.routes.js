"use strict";
/**
 * Investigation Routes
 * /api/v1/investigations
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const middleware_1 = require("../middleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(middleware_1.authenticate);
// Public read for analysts and above, write for investigators and above
router.get('/', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.investigationController.findAll));
router.get('/stats', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.investigationController.getStats));
router.get('/:id', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.AUDITOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.investigationController.findById));
router.post('/', (0, middleware_1.requirePermission)(types_1.Permission.INVESTIGATION_CREATE), (0, middleware_1.asyncHandler)(controllers_1.investigationController.create));
router.put('/:id', (0, middleware_1.requirePermission)(types_1.Permission.INVESTIGATION_UPDATE), (0, middleware_1.asyncHandler)(controllers_1.investigationController.update));
// Get forensic report for investigation
router.get('/:id/forensic-report', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.investigationController.getForensicReport));
router.delete('/:id', (0, middleware_1.requirePermission)(types_1.Permission.INVESTIGATION_DELETE), (0, middleware_1.asyncHandler)(controllers_1.investigationController.delete));
exports.default = router;
//# sourceMappingURL=investigation.routes.js.map