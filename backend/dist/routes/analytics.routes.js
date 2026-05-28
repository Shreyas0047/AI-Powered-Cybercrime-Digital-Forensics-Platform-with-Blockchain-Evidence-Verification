"use strict";
/**
 * Analytics Routes
 * API endpoints for behavioral analytics and investigation correlation
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../middleware");
const analytics_controller_1 = require("../controllers/analytics.controller");
const router = (0, express_1.Router)();
// ============================================
// BEHAVIORAL ANALYTICS
// ============================================
/**
 * @route   GET /api/v1/analytics/patterns
 * @desc    Get behavioral patterns
 * @access  Private (Authenticated)
 */
router.get('/patterns', middleware_1.authenticate, analytics_controller_1.analyticsController.getBehavioralPatterns);
/**
 * @route   POST /api/v1/analytics/analyze-behavior
 * @desc    Analyze process behavior
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/analyze-behavior', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'forensic_analyst']), analytics_controller_1.analyticsController.analyzeProcessBehavior);
/**
 * @route   POST /api/v1/analytics/detect-anomalies
 * @desc    Detect anomalies in evidence
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/detect-anomalies', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'forensic_analyst']), analytics_controller_1.analyticsController.detectAnomalies);
/**
 * @route   POST /api/v1/analytics/baseline
 * @desc    Analyze behavioral baseline
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/baseline', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'forensic_analyst']), analytics_controller_1.analyticsController.analyzeBaseline);
// ============================================
// INVESTIGATION CORRELATION
// ============================================
/**
 * @route   GET /api/v1/analytics/clusters
 * @desc    Get investigation clusters
 * @access  Private (Authenticated)
 */
router.get('/clusters', middleware_1.authenticate, analytics_controller_1.analyticsController.getInvestigationClusters);
/**
 * @route   GET /api/v1/analytics/clusters/:investigationId/relationships
 * @desc    Get relationships for specific investigation
 * @access  Private (Authenticated)
 */
router.get('/clusters/:investigationId/relationships', middleware_1.authenticate, analytics_controller_1.analyticsController.getInvestigationRelationships);
/**
 * @route   POST /api/v1/analytics/clusters/:investigationId/score
 * @desc    Score relationship between investigations
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.post('/clusters/:investigationId/score', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'forensic_analyst']), analytics_controller_1.analyticsController.scoreRelationship);
/**
 * @route   GET /api/v1/analytics/insights
 * @desc    Get correlation insights
 * @access  Private (Authenticated)
 */
router.get('/insights', middleware_1.authenticate, analytics_controller_1.analyticsController.getCorrelationInsights);
/**
 * @route   GET /api/v1/analytics/cluster-visualization
 * @desc    Get cluster visualization data
 * @access  Private (Authenticated)
 */
router.get('/cluster-visualization', middleware_1.authenticate, analytics_controller_1.analyticsController.getClusterVisualization);
/**
 * @route   GET /api/v1/analytics/dashboard
 * @desc    Get analytics dashboard data
 * @access  Private (Authenticated, Admin/Analyst)
 */
router.get('/dashboard', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'forensic_analyst']), analytics_controller_1.analyticsController.getDashboardData);
/**
 * @route   POST /api/v1/analytics/session/analyze
 * @desc    Analyze a sandbox session
 * @access  Private (Authenticated, Admin/Forensic Analyst)
 */
router.post('/session/analyze', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'forensic_analyst']), (0, middleware_1.asyncHandler)(analytics_controller_1.analyticsController.analyzeSession));
/**
 * @route   POST /api/v1/analytics/sessions/compare
 * @desc    Compare multiple sandbox sessions
 * @access  Private (Authenticated, Admin/Forensic Analyst)
 */
router.post('/sessions/compare', middleware_1.authenticate, (0, middleware_1.authorize)(['admin', 'forensic_analyst']), (0, middleware_1.asyncHandler)(analytics_controller_1.analyticsController.compareSessions));
exports.default = router;
//# sourceMappingURL=analytics.routes.js.map