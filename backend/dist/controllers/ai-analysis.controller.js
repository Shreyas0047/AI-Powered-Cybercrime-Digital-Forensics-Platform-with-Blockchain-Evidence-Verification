"use strict";
/**
 * AI Analysis Controller
 * Handles AI-powered forensic analysis endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiController = exports.AIController = void 0;
const services_1 = require("../services");
class AIController {
    /**
     * POST /api/v1/ai/analyze/telemetry
     * Analyze telemetry from sandbox execution
     */
    async analyzeTelemetry(req, res) {
        const { sessionId, events, metadata } = req.body;
        if (!sessionId || !events || !Array.isArray(events)) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: sessionId, events (array)',
            });
            return;
        }
        try {
            const result = await services_1.aiAnalysisService.analyzeTelemetry({
                sessionId,
                investigationId: req.body.investigationId,
                events,
                metadata,
            });
            const response = {
                success: true,
                message: 'Telemetry analysis completed',
                data: result,
            };
            res.json(response);
        }
        catch (err) {
            const error = err;
            res.status(500).json({
                success: false,
                message: error.message || 'Analysis failed',
            });
        }
    }
    /**
     * POST /api/v1/ai/enrich/alert
     * Enrich alert with AI analysis
     */
    async enrichAlert(req, res) {
        const { alertId, title, description, type, severity, iocIndicators } = req.body;
        if (!alertId || !title) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: alertId, title',
            });
            return;
        }
        try {
            const result = await services_1.aiAnalysisService.enrichAlert({
                alertId,
                title,
                description,
                type,
                severity,
                iocIndicators,
            });
            const response = {
                success: true,
                message: 'Alert enriched with AI analysis',
                data: result,
            };
            res.json(response);
        }
        catch (err) {
            const error = err;
            res.status(500).json({
                success: false,
                message: error.message || 'Alert enrichment failed',
            });
        }
    }
    /**
     * POST /api/v1/ai/summarize/investigation
     * Generate AI investigation summary
     */
    async summarizeInvestigation(req, res) {
        const { investigationId, caseNumber, evidence, reports, alerts, timeline } = req.body;
        if (!investigationId) {
            res.status(400).json({
                success: false,
                message: 'Missing required field: investigationId',
            });
            return;
        }
        try {
            const result = await services_1.aiAnalysisService.generateInvestigationSummary({
                investigationId,
                caseNumber: caseNumber || '',
                evidence: evidence || [],
                reports: reports || [],
                alerts: alerts || [],
                timeline: timeline || [],
            });
            const response = {
                success: true,
                message: 'Investigation summary generated',
                data: result,
            };
            res.json(response);
        }
        catch (err) {
            const error = err;
            res.status(500).json({
                success: false,
                message: error.message || 'Summary generation failed',
            });
        }
    }
    /**
     * POST /api/v1/ai/analyze/report
     * Analyze forensic report
     */
    async analyzeReport(req, res) {
        const { reportData, investigationId } = req.body;
        if (!reportData) {
            res.status(400).json({
                success: false,
                message: 'Missing required field: reportData',
            });
            return;
        }
        try {
            const result = await services_1.aiAnalysisService.analyzeReport(reportData, investigationId);
            const response = {
                success: true,
                message: 'Report analysis completed',
                data: result,
            };
            res.json(response);
        }
        catch (err) {
            const error = err;
            res.status(500).json({
                success: false,
                message: error.message || 'Report analysis failed',
            });
        }
    }
    /**
     * GET /api/v1/ai/health
     * Check AI service health
     */
    async checkHealth(req, res) {
        try {
            const healthy = await services_1.aiAnalysisService.checkHealth();
            const response = {
                success: healthy,
                message: healthy ? 'AI service operational' : 'AI service unavailable',
                data: {
                    status: healthy ? 'operational' : 'unavailable',
                    service: 'forensic-ai-analysis-engine',
                },
            };
            res.status(healthy ? 200 : 503).json(response);
        }
        catch (err) {
            res.status(503).json({
                success: false,
                message: 'AI service unavailable',
                data: { status: 'unavailable' },
            });
        }
    }
}
exports.AIController = AIController;
exports.aiController = new AIController();
exports.default = exports.aiController;
//# sourceMappingURL=ai-analysis.controller.js.map