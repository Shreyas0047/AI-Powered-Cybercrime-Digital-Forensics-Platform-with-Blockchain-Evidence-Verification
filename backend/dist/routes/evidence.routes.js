"use strict";
/**
 * Evidence Routes
 * /api/v1/evidence
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const middleware_1 = require("../middleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(middleware_1.authenticate);
// List all evidence
router.get('/', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.AUDITOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.evidenceController.findAll));
// Evidence upload (multipart/form-data)
router.post('/upload', (0, middleware_1.requirePermission)(types_1.Permission.EVIDENCE_UPLOAD), controllers_1.evidenceController.uploadFile, (0, middleware_1.asyncHandler)(controllers_1.evidenceController.upload));
// Get evidence by investigation
router.get('/investigation/:investigationId', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.AUDITOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.evidenceController.findByInvestigation));
// Get evidence by ID
router.get('/:id', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.AUDITOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.evidenceController.findById));
// Verify evidence integrity
router.post('/:id/verify', (0, middleware_1.requirePermission)(types_1.Permission.EVIDENCE_VERIFY), (0, middleware_1.asyncHandler)(controllers_1.evidenceController.verifyIntegrity));
// Delete evidence
router.delete('/:id', (0, middleware_1.requirePermission)(types_1.Permission.EVIDENCE_DELETE), (0, middleware_1.asyncHandler)(controllers_1.evidenceController.delete));
exports.default = router;
//# sourceMappingURL=evidence.routes.js.map