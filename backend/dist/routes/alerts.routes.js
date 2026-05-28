"use strict";
/**
 * Alerts Routes
 * /api/v1/alerts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const alerts_controller_1 = require("../controllers/alerts.controller");
const middleware_1 = require("../middleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(middleware_1.authenticate);
// List all alerts
router.get('/', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(alerts_controller_1.alertController.findAll));
// Get alert by ID
router.get('/:id', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(alerts_controller_1.alertController.findById));
// Acknowledge alert
router.post('/:id/acknowledge', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(alerts_controller_1.alertController.acknowledge));
// Resolve alert
router.post('/:id/resolve', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(alerts_controller_1.alertController.resolve));
exports.default = router;
//# sourceMappingURL=alerts.routes.js.map