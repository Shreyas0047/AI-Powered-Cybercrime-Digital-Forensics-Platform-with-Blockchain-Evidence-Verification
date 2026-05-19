"use strict";
/**
 * Analytics Controller
 * Handles behavioral analytics and investigation correlation endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsController = exports.AnalyticsController = void 0;
const behavioral_analytics_service_1 = require("../services/behavioral-analytics.service");
const investigation_correlation_service_1 = require("../services/investigation-correlation.service");
class AnalyticsController {
    /**
     * GET /api/v1/analytics/patterns
     * Get behavioral patterns
     */
    async getBehavioralPatterns(req, res) {
        try {
            const patterns = behavioral_analytics_service_1.behavioralAnalyticsService.getBehavioralPatterns();
            const response = {
                success: true,
                message: 'Behavioral patterns retrieved',
                data: { patterns },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get behavioral patterns',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/analytics/analyze-behavior
     * Analyze process behavior
     */
    async analyzeProcessBehavior(req, res) {
        try {
            const { evidenceId } = req.body;
            if (!evidenceId) {
                res.status(400).json({
                    success: false,
                    message: 'Evidence ID is required',
                });
                return;
            }
            const behavior = await behavioral_analytics_service_1.behavioralAnalyticsService.analyzeProcessBehavior(evidenceId);
            const response = {
                success: true,
                message: 'Process behavior analyzed',
                data: { behavior },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to analyze process behavior',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/analytics/detect-anomalies
     * Detect anomalies in evidence
     */
    async detectAnomalies(req, res) {
        try {
            const { evidenceId } = req.body;
            if (!evidenceId) {
                res.status(400).json({
                    success: false,
                    message: 'Evidence ID is required',
                });
                return;
            }
            const anomalies = await behavioral_analytics_service_1.behavioralAnalyticsService.detectAnomalies(evidenceId);
            const response = {
                success: true,
                message: `Detected ${anomalies.length} anomalies`,
                data: { anomalies },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to detect anomalies',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/analytics/baseline
     * Analyze behavioral baseline
     */
    async analyzeBaseline(req, res) {
        try {
            const { investigationId } = req.body;
            if (!investigationId) {
                res.status(400).json({
                    success: false,
                    message: 'Investigation ID is required',
                });
                return;
            }
            const baseline = await behavioral_analytics_service_1.behavioralAnalyticsService.analyzeBehavioralBaseline(investigationId);
            const response = {
                success: true,
                message: 'Behavioral baseline analyzed',
                data: baseline,
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to analyze baseline',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/analytics/clusters
     * Get investigation clusters
     */
    async getInvestigationClusters(req, res) {
        try {
            const clusters = await investigation_correlation_service_1.investigationCorrelationService.correlateInvestigations();
            const response = {
                success: true,
                message: `Found ${clusters.length} investigation clusters`,
                data: { clusters },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get investigation clusters',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/analytics/clusters/:investigationId/relationships
     * Get relationships for specific investigation
     */
    async getInvestigationRelationships(req, res) {
        try {
            const { investigationId } = req.params;
            const relationships = await investigation_correlation_service_1.investigationCorrelationService.getInvestigationRelationships(investigationId);
            const response = {
                success: true,
                message: `Found ${relationships.length} relationships`,
                data: { relationships },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get investigation relationships',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * POST /api/v1/analytics/clusters/:investigationId/score
     * Score relationship between investigations
     */
    async scoreRelationship(req, res) {
        try {
            const { investigationId } = req.params;
            const { targetInvestigationId } = req.body;
            if (!targetInvestigationId) {
                res.status(400).json({
                    success: false,
                    message: 'Target investigation ID is required',
                });
                return;
            }
            const score = await investigation_correlation_service_1.investigationCorrelationService.scoreRelationship(investigationId, targetInvestigationId);
            const response = {
                success: true,
                message: 'Relationship scored',
                data: { score },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to score relationship',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/analytics/insights
     * Get correlation insights
     */
    async getCorrelationInsights(req, res) {
        try {
            const { investigationId } = req.query;
            const insights = await investigation_correlation_service_1.investigationCorrelationService.generateCorrelationInsights(investigationId);
            const response = {
                success: true,
                message: `Generated ${insights.length} insights`,
                data: { insights },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get correlation insights',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/analytics/cluster-visualization
     * Get cluster visualization data
     */
    async getClusterVisualization(req, res) {
        try {
            const visualization = await investigation_correlation_service_1.investigationCorrelationService.getClusterVisualization();
            const response = {
                success: true,
                message: 'Cluster visualization retrieved',
                data: visualization,
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get cluster visualization',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * GET /api/v1/analytics/dashboard
     * Get analytics dashboard data
     */
    async getDashboardData(req, res) {
        try {
            // Gather all dashboard metrics
            const [clusters, insights, patterns] = await Promise.all([
                investigation_correlation_service_1.investigationCorrelationService.correlateInvestigations(),
                investigation_correlation_service_1.investigationCorrelationService.generateCorrelationInsights(),
                Promise.resolve(behavioral_analytics_service_1.behavioralAnalyticsService.getBehavioralPatterns()),
            ]);
            const response = {
                success: true,
                message: 'Dashboard data retrieved',
                data: {
                    summary: {
                        totalClusters: clusters.length,
                        highSeverityInsights: insights.filter(i => i.severity === 'critical' || i.severity === 'high').length,
                        totalPatterns: patterns.length,
                        criticalPatterns: patterns.filter(p => p.severityWeight >= 75).length,
                    },
                    clusters: clusters.slice(0, 10),
                    insights: insights.slice(0, 10),
                    patterns: patterns.map(p => ({
                        name: p.name,
                        category: p.category,
                        severity: p.severityWeight >= 75 ? 'high' : p.severityWeight >= 50 ? 'medium' : 'low',
                        mitreTactics: p.mitreTactics,
                    })),
                },
            };
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get dashboard data',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
exports.AnalyticsController = AnalyticsController;
exports.analyticsController = new AnalyticsController();
exports.default = exports.analyticsController;
//# sourceMappingURL=analytics.controller.js.map