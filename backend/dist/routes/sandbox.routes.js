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
router.use(middleware_1.authenticate);
router.get('/health', (0, middleware_1.authorize)(types_1.UserRole.AUDITOR, types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.getHealth));
router.get('/simulators', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.listSimulators));
router.post('/sessions', (0, middleware_1.authorize)(types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.startSession));
router.get('/sessions', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.findAll));
router.get('/sessions/:sessionId', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.AUDITOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.findById));
router.post('/sessions/:sessionId/stop', (0, middleware_1.authorize)(types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.stopSession));
router.post('/sessions/:sessionId/terminate', (0, middleware_1.authorize)(types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.terminateSession));
router.get('/stats', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.getStats));
router.get('/telemetry-url', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.getTelemetryUrl));
router.post('/vm/reset', (0, middleware_1.authorize)(types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.resetVm));
router.get('/vm/status', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.getVmStatus));
router.get('/monitoring/status', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.getMonitoringStatus));
router.get('/execution/status', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.getExecutionStatus));
router.get('/logs', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.getLogs));
router.post('/runtime/start', (0, middleware_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.startRuntime));
router.post('/sessions/start', (0, middleware_1.authorize)(types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.receiveSessionStart));
router.post('/sessions/:sessionId/complete', (0, middleware_1.authorize)(types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.receiveSessionComplete));
router.post('/sessions/:sessionId/events', (0, middleware_1.authorize)(types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.receiveEvents));
router.post('/launch-agent', (0, middleware_1.authorize)(types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.sandboxController.launchAgent));
exports.default = router;
//# sourceMappingURL=sandbox.routes.js.map