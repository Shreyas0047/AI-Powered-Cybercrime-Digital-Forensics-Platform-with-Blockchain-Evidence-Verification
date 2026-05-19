"use strict";
/**
 * Threat Analysis Routes
 * /api/v1/threat-analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
router.use(middleware_1.authenticate);
router.post('/analyze', (0, middleware_1.asyncHandler)(controllers_1.threatAnalysisController.analyzeSession));
router.get('/report/:sessionId', (0, middleware_1.asyncHandler)(controllers_1.threatAnalysisController.getIntelligenceReport));
router.get('/summary/:sessionId', (0, middleware_1.asyncHandler)(controllers_1.threatAnalysisController.getIntelligenceSummary));
exports.default = router;
//# sourceMappingURL=threat-analysis.routes.js.map