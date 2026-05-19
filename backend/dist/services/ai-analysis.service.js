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
     * Analyze telemetry events from sandbox execution
     */
    async analyzeTelemetry(request) {
        try {
            const response = await this.client.post('/api/v1/analyze/telemetry', {
                session_id: request.sessionId,
                investigation_id: request.investigationId,
                events: request.events,
                metadata: request.metadata,
            });
            if (!response.data.success) {
                throw new middleware_1.AppError('AI analysis failed', 500, 'AI_ANALYSIS_FAILED');
            }
            return response.data.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                if (error.code === 'ECONNREFUSED') {
                    throw new middleware_1.AppError('AI service unavailable', 503, 'AI_SERVICE_UNAVAILABLE');
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
            if (axios_1.default.isAxiosError(error) && error.code === 'ECONNREFUSED') {
                throw new middleware_1.AppError('AI service unavailable', 503, 'AI_SERVICE_UNAVAILABLE');
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
            if (axios_1.default.isAxiosError(error) && error.code === 'ECONNREFUSED') {
                throw new middleware_1.AppError('AI service unavailable', 503, 'AI_SERVICE_UNAVAILABLE');
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