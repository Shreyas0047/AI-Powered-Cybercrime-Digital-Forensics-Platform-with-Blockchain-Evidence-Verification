"use strict";
/**
 * Logs Routes
 * /api/v1/logs
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
router.use(middleware_1.authenticate);
router.get('/', (0, middleware_1.asyncHandler)(controllers_1.logsController.findAll));
router.get('/stats', (0, middleware_1.asyncHandler)(controllers_1.logsController.getStats));
router.get('/audit', (0, middleware_1.asyncHandler)(controllers_1.logsController.getAuditLogs));
router.get('/audit/stats', (0, middleware_1.asyncHandler)(controllers_1.logsController.getAuditStats));
exports.default = router;
//# sourceMappingURL=logs.routes.js.map