"use strict";
/**
 * Sandbox Routes
 * /api/v1/sandbox
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const middleware_1 = require("../middleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// Sandbox sync endpoints
router.use(middleware_1.authenticate);
// Session endpoints
router.post('/sessions/start', (0, middleware_1.authorize)(types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.receiveSessionStart));
router.post('/sessions/:sessionId/complete', (0, middleware_1.authorize)(types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.receiveSessionComplete));
router.post('/sessions/:sessionId/events', (0, middleware_1.authorize)(types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.receiveEvents));
// List and get sessions
router.get('/sessions', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.findAll));
router.get('/sessions/:sessionId', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.AUDITOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.findById));
// Statistics
router.get('/stats', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.getStats));
exports.default = router;
//# sourceMappingURL=sandbox.routes.js.map