"use strict";
/**
 * AI Analysis Service
 * Integration layer for communicating with Python AI microservice
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiAnalysisService = exports.AIAnalysisService = void 0;
const axios_1 = __importDefault(require("axios"));
const middleware_1 = require("../middleware");
const websocket_service_1 = require("./websocket.service");
class AIAnalysisService {
    client;
    timeout;
    constructor() {
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8001';
        this.timeout = parseInt(process.env.AI_SERVICE_TIMEOUT || '60000', 10);
        this.client = axios_1.default.create({
            baseURL: aiServiceUrl,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
    /**
     * Normalize granular simulator event types to coarse AI-service types
     */
    normalizeEventType(eventType) {
        const t = eventType.toLowerCase();
        if (/file|encrypt|write|delete/.test(t))
            return 'file';
        if (/process|start|terminate/.test(t))
            return 'process';
        if (/registry/.test(t))
            return 'registry';
        if (/network|connect|dns|beacon/.test(t))
            return 'network';
        return 'behavior';
    }
    /**
     * Analyze telemetry events from sandbox execution
     */
    async analyzeTelemetry(request) {
        try {
            const normalizedEvents = request.events.map((event) => ({
                ...event,
                type: this.normalizeEventType(event.type),
            }));
            const response = await this.client.post('/api/v1/analyze/telemetry', {
                session_id: request.sessionId,
                investigation_id: request.investigationId,
                events: normalizedEvents,
                metadata: request.metadata,
            });
            if (!response.data.success) {
                throw new middleware_1.AppError('AI analysis failed', 500, 'AI_ANALYSIS_FAILED');
            }
            const result = response.data.data;
            websocket_service_1.websocketService.emitAIAnalysisComplete(request.investigationId || request.sessionId, result);
            return result;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
                    // Degraded mode — return a minimal result instead of crashing
                    return {
                        session_id: request.sessionId,
                        analysis_timestamp: new Date().toISOString(),
                        total_events: request.events.length,
                        suspicious_events: 0,
                        threat_classification: {},
                        severity_score: 0,
                        severity_level: 'informational',
                        anomalies: [],
                        behavioral_summary: 'AI service unavailable — analysis deferred. Events stored for later processing.',
                        recommendations: ['AI service is currently unreachable. Retry analysis when service recovers.'],
                        confidence: 0,
                    };
                }
                if (error.response) {
                    throw new middleware_1.AppError(`AI service error: ${error.response.status}`, error.response.status, 'AI_SERVICE_ERROR');
                }
            }
            throw new middleware_1.AppError('Failed to analyze telemetry', 500, 'ANALYSIS_FAILED');
        }
    }
    /**
     * Enrich alert with AI analysis
     */
    async enrichAlert(alertData) {
        try {
            const response = await this.client.post('/api/v1/enrich/alert', alertData);
            if (!response.data.success) {
                throw new middleware_1.AppError('AI alert enrichment failed', 500, 'AI_ENRICHMENT_FAILED');
            }
            return response.data.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error) && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT')) {
                return { alert_id: alertData.alertId, ai_severity_assessment: alertData.severity, confidence: 0, analysis_summary: 'AI service unavailable — enrichment deferred.', recommendations: [] };
            }
            throw new middleware_1.AppError('Failed to enrich alert', 500, 'ENRICHMENT_FAILED');
        }
    }
    /**
     * Generate AI-powered investigation summary
     */
    async generateInvestigationSummary(request) {
        try {
            const response = await this.client.post('/api/v1/summarize/investigation', request);
            if (!response.data.success) {
                throw new middleware_1.AppError('AI summarization failed', 500, 'AI_SUMMARIZATION_FAILED');
            }
            return response.data.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error) && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT')) {
                return { executive_summary: 'AI service unavailable — summary deferred.', key_findings: [], recommendations: ['Retry when AI service recovers.'], confidence: 0 };
            }
            throw new middleware_1.AppError('Failed to generate summary', 500, 'SUMMARIZATION_FAILED');
        }
    }
    /**
     * Analyze forensic report
     */
    async analyzeReport(reportData, investigationId) {
        try {
            const response = await this.client.post('/api/v1/analyze/report', {
                report_data: reportData,
                investigation_id: investigationId,
            });
            if (!response.data.success) {
                throw new middleware_1.AppError('AI report analysis failed', 500, 'AI_REPORT_ANALYSIS_FAILED');
            }
            return response.data.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error) && error.code === 'ECONNREFUSED') {
                throw new middleware_1.AppError('AI service unavailable', 503, 'AI_SERVICE_UNAVAILABLE');
            }
            throw new middleware_1.AppError('Failed to analyze report', 500, 'REPORT_ANALYSIS_FAILED');
        }
    }
    /**
     * Check AI service health
     */
    async checkHealth() {
        try {
            const response = await this.client.get('/health', { timeout: 5000 });
            return response.data.status === 'healthy';
        }
        catch {
            return false;
        }
    }
}
exports.AIAnalysisService = AIAnalysisService;
exports.aiAnalysisService = new AIAnalysisService();
exports.default = exports.aiAnalysisService;
//# sourceMappingURL=ai-analysis.service.js.map