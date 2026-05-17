/**
 * AI Analysis Service
 * Integration layer for communicating with Python AI microservice
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { AppError } from '../middleware';

export interface TelemetryEvent {
  timestamp: string;
  type: string;
  source: string;
  details: Record<string, any>;
}

export interface TelemetryAnalysisRequest {
  sessionId: string;
  investigationId?: string;
  events: TelemetryEvent[];
  metadata?: Record<string, any>;
}

export interface TelemetryAnalysisResult {
  session_id: string;
  analysis_timestamp: string;
  total_events: number;
  suspicious_events: number;
  threat_classification: Record<string, number>;
  severity_score: number;
  severity_level: string;
  anomalies: Array<{
    type: string;
    description: string;
    severity: string;
    deviation_score: number;
  }>;
  behavioral_summary: string;
  recommendations: string[];
  confidence: number;
}

export interface AlertEnrichmentRequest {
  alertId: string;
  title: string;
  description: string;
  type: string;
  severity: string;
  iocIndicators?: Array<{ type: string; value: string }>;
}

export interface InvestigationSummaryRequest {
  investigationId: string;
  caseNumber: string;
  evidence: any[];
  reports: any[];
  alerts: any[];
  timeline: any[];
}

export class AIAnalysisService {
  private client: AxiosInstance;
  private timeout: number;

  constructor() {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8001';
    this.timeout = parseInt(process.env.AI_SERVICE_TIMEOUT || '60000', 10);

    this.client = axios.create({
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
  async analyzeTelemetry(request: TelemetryAnalysisRequest): Promise<TelemetryAnalysisResult> {
    try {
      const response = await this.client.post('/api/v1/analyze/telemetry', {
        session_id: request.sessionId,
        investigation_id: request.investigationId,
        events: request.events,
        metadata: request.metadata,
      });

      if (!response.data.success) {
        throw new AppError('AI analysis failed', 500, 'AI_ANALYSIS_FAILED');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new AppError('AI service unavailable', 503, 'AI_SERVICE_UNAVAILABLE');
        }
        if (error.response) {
          throw new AppError(`AI service error: ${error.response.status}`, error.response.status, 'AI_SERVICE_ERROR');
        }
      }
      throw new AppError('Failed to analyze telemetry', 500, 'ANALYSIS_FAILED');
    }
  }

  /**
   * Enrich alert with AI analysis
   */
  async enrichAlert(alertData: AlertEnrichmentRequest): Promise<any> {
    try {
      const response = await this.client.post('/api/v1/enrich/alert', alertData);

      if (!response.data.success) {
        throw new AppError('AI alert enrichment failed', 500, 'AI_ENRICHMENT_FAILED');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        throw new AppError('AI service unavailable', 503, 'AI_SERVICE_UNAVAILABLE');
      }
      throw new AppError('Failed to enrich alert', 500, 'ENRICHMENT_FAILED');
    }
  }

  /**
   * Generate AI-powered investigation summary
   */
  async generateInvestigationSummary(request: InvestigationSummaryRequest): Promise<any> {
    try {
      const response = await this.client.post('/api/v1/summarize/investigation', request);

      if (!response.data.success) {
        throw new AppError('AI summarization failed', 500, 'AI_SUMMARIZATION_FAILED');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        throw new AppError('AI service unavailable', 503, 'AI_SERVICE_UNAVAILABLE');
      }
      throw new AppError('Failed to generate summary', 500, 'SUMMARIZATION_FAILED');
    }
  }

  /**
   * Analyze forensic report
   */
  async analyzeReport(reportData: any, investigationId?: string): Promise<any> {
    try {
      const response = await this.client.post('/api/v1/analyze/report', {
        report_data: reportData,
        investigation_id: investigationId,
      });

      if (!response.data.success) {
        throw new AppError('AI report analysis failed', 500, 'AI_REPORT_ANALYSIS_FAILED');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        throw new AppError('AI service unavailable', 503, 'AI_SERVICE_UNAVAILABLE');
      }
      throw new AppError('Failed to analyze report', 500, 'REPORT_ANALYSIS_FAILED');
    }
  }

  /**
   * Check AI service health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}

export const aiAnalysisService = new AIAnalysisService();
export default aiAnalysisService;