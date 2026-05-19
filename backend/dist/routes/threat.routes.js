"use strict";
/**
 * Threat Intelligence Routes
 * API endpoints for IOC and threat intelligence
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../middleware");
const threat_controller_1 = require("../controllers/threat.controller");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/v1/threat/ioc
 * @desc    Create IOC
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/ioc', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), threat_controller_1.threatIntelligenceController.createIOC);
/**
 * @route   GET /api/v1/threat/ioc/:iocId
 * @desc    Get IOC by ID
 * @access  Private (Authenticated)
 */
router.get('/ioc/:iocId', middleware_1.authenticate, threat_controller_1.threatIntelligenceController.getIOC);
/**
 * @route   GET /api/v1/threat/iocs
 * @desc    Search IOCs
 * @access  Private (Authenticated)
 */
router.get('/iocs', middleware_1.authenticate, threat_controller_1.threatIntelligenceController.searchIOCs);
/**
 * @route   PATCH /api/v1/threat/ioc/:iocId/status
 * @desc    Update IOC status
 * @access  Private (Authenticated, Admin)
 */
router.patch('/ioc/:iocId/status', middleware_1.authenticate, (0, middleware_1.authorize)(['admin']), threat_controller_1.threatIntelligenceController.updateIOCStatus);
/**
 * @route   POST /api/v1/threat/ioc/link
 * @desc    Link IOC to evidence
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/ioc/link', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), threat_controller_1.threatIntelligenceController.linkIOCToEvidence);
/**
 * @route   POST /api/v1/threat/ioc/match
 * @desc    Match IOCs against evidence hashes
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/ioc/match', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), threat_controller_1.threatIntelligenceController.matchIOCs);
/**
 * @route   GET /api/v1/threat/correlation/:evidenceId
 * @desc    Correlate evidence
 * @access  Private (Authenticated)
 */
router.get('/correlation/:evidenceId', middleware_1.authenticate, threat_controller_1.threatIntelligenceController.correlateEvidence);
/**
 * @route   POST /api/v1/threat/correlation
 * @desc    Create threat correlation
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/correlation', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), threat_controller_1.threatIntelligenceController.createCorrelation);
/**
 * @route   POST /api/v1/threat/enrich/:investigationId
 * @desc    Enrich investigation
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/enrich/:investigationId', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), threat_controller_1.threatIntelligenceController.enrichInvestigation);
/**
 * @route   GET /api/v1/threat/analytics/:type
 * @desc    Generate threat analytics
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.get('/analytics/:type', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'analyst']), threat_controller_1.threatIntelligenceController.generateAnalytics);
/**
 * @route   GET /api/v1/threat/stats
 * @desc    Get IOC statistics
 * @access  Private (Authenticated)
 */
router.get('/stats', middleware_1.authenticate, threat_controller_1.threatIntelligenceController.getStats);
/**
 * @route   GET /api/v1/threat/graph
 * @desc    Get threat relationship graph
 * @access  Private (Authenticated)
 */
router.get('/graph', middleware_1.authenticate, threat_controller_1.threatIntelligenceController.getThreatGraph);
exports.default = router;
//# sourceMappingURL=threat.routes.js.map