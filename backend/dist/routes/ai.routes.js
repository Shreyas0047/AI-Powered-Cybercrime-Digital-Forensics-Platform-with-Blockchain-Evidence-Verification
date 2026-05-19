"use strict";
/**
 * AI Analysis Routes
 * /api/v1/ai
 *
 * Handles AI-powered forensic analysis endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const middleware_1 = require("../middleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// All AI routes require authentication
router.use(middleware_1.authenticate);
// Analyze telemetry from sandbox
router.post('/analyze/telemetry', (0, middleware_1.authorize)(types_1.UserRole.SANDBOX_OPERATOR, types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.aiController.analyzeTelemetry));
// Enrich alert with AI analysis
router.post('/enrich/alert', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.aiController.enrichAlert));
// Generate AI investigation summary
router.post('/summarize/investigation', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.aiController.summarizeInvestigation));
// Analyze forensic report
router.post('/analyze/report', (0, middleware_1.authorize)(types_1.UserRole.FORENSIC_ANALYST, types_1.UserRole.SECURITY_REVIEWER, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, middleware_1.asyncHandler)(controllers_1.aiController.analyzeReport));
// Check AI service health
router.get('/health', (0, middleware_1.asyncHandler)(controllers_1.aiController.checkHealth));
exports.default = router;
//# sourceMappingURL=ai.routes.js.map