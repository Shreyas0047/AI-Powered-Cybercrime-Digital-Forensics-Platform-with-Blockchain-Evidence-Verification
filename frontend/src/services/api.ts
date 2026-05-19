import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type {
  User, LoginCredentials, Investigation, Evidence, Alert,
  SandboxSession, TelemetryAnalysisResult, InvestigationSummary,
  ApiResponse, PaginationParams, DashboardStats
} from '../types';
import type {
  BlockchainStatus, VerificationStats, VerificationResult,
  BatchVerificationResult, PackageVerificationResult,
  BlockchainAuditEntry, EvidenceIntegrityRecord, TamperAlert,
  HashGenerationResult, HashVerificationResult
} from '../types/blockchain';
import type {
  ForensicReportSummary, ForensicReportDetail, LogEntry,
  AppSettings, EvidenceArtifact, ForensicEvidenceDetail
} from '../types/reports';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; tokens: { accessToken: string; refreshToken: string } }>> {
    const response = await this.client.post('/auth/login', credentials);
    const accessToken = response.data?.data?.tokens?.accessToken;
    const refreshToken = response.data?.data?.tokens?.refreshToken;
    if (accessToken) {
      localStorage.setItem('token', accessToken);
      localStorage.setItem('accessToken', accessToken);
    }
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // Dashboard
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    const response = await this.client.get('/dashboard/stats');
    return response.data;
  }

  // Investigations
  async getInvestigations(params: PaginationParams): Promise<ApiResponse<Investigation[]>> {
    const response = await this.client.get('/investigations', { params });
    return response.data;
  }

  async getInvestigation(id: string): Promise<ApiResponse<Investigation>> {
    const response = await this.client.get(`/investigations/${id}`);
    return response.data;
  }

  async createInvestigation(data: Partial<Investigation>): Promise<ApiResponse<Investigation>> {
    const response = await this.client.post('/investigations', data);
    return response.data;
  }

  async updateInvestigation(id: string, data: Partial<Investigation>): Promise<ApiResponse<Investigation>> {
    const response = await this.client.put(`/investigations/${id}`, data);
    return response.data;
  }

  async deleteInvestigation(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/investigations/${id}`);
    return response.data;
  }

  // Evidence
  async getEvidence(params: PaginationParams): Promise<ApiResponse<Evidence[]>> {
    const response = await this.client.get('/evidence', { params });
    return response.data;
  }

  async getEvidenceByInvestigation(investigationId: string, params: PaginationParams): Promise<ApiResponse<Evidence[]>> {
    const response = await this.client.get(`/evidence/investigation/${investigationId}`, { params });
    return response.data;
  }

  async getEvidenceById(id: string): Promise<ApiResponse<Evidence>> {
    const response = await this.client.get(`/evidence/${id}`);
    return response.data;
  }

  async uploadEvidence(formData: FormData): Promise<ApiResponse<Evidence>> {
    const response = await this.client.post('/evidence/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async verifyEvidence(id: string): Promise<ApiResponse<{ verified: boolean }>> {
    const response = await this.client.post(`/evidence/${id}/verify`);
    return response.data;
  }

  async deleteEvidence(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/evidence/${id}`);
    return response.data;
  }

  // Alerts
  async getAlerts(params: PaginationParams): Promise<ApiResponse<Alert[]>> {
    const response = await this.client.get('/alerts', { params });
    return response.data;
  }

  async getAlert(id: string): Promise<ApiResponse<Alert>> {
    const response = await this.client.get(`/alerts/${id}`);
    return response.data;
  }

  async acknowledgeAlert(id: string): Promise<ApiResponse<Alert>> {
    const response = await this.client.post(`/alerts/${id}/acknowledge`);
    return response.data;
  }

  async resolveAlert(id: string, resolution: Record<string, unknown>): Promise<ApiResponse<Alert>> {
    const response = await this.client.post(`/alerts/${id}/resolve`, resolution);
    return response.data;
  }

  // Sandbox Sessions
  async getSandboxSessions(params: PaginationParams): Promise<ApiResponse<SandboxSession[]>> {
    const response = await this.client.get('/sandbox/sessions', { params });
    return response.data;
  }

  async getSandboxSession(id: string): Promise<ApiResponse<SandboxSession>> {
    const response = await this.client.get(`/sandbox/sessions/${id}`);
    return response.data;
  }

  async getSandboxStats(): Promise<ApiResponse<{ total: number; byStatus: Record<string, number>; avgDuration: number }>> {
    const response = await this.client.get('/sandbox/stats');
    return response.data;
  }

  // AI Analysis
  async analyzeTelemetry(sessionId: string, events: unknown[]): Promise<ApiResponse<TelemetryAnalysisResult>> {
    const response = await this.client.post('/ai/analyze/telemetry', { sessionId, events });
    return response.data;
  }

  async enrichAlert(alertData: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.client.post('/ai/enrich/alert', alertData);
    return response.data;
  }

  async summarizeInvestigation(data: Record<string, unknown>): Promise<ApiResponse<InvestigationSummary>> {
    const response = await this.client.post('/ai/summarize/investigation', data);
    return response.data;
  }

  async analyzeReport(reportData: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    const response = await this.client.post('/ai/analyze/report', reportData);
    return response.data;
  }

  async checkAIHealth(): Promise<ApiResponse<{ status: string }>> {
    const response = await this.client.get('/ai/health');
    return response.data;
  }

  // Sync Endpoints
  async getSyncHealth(): Promise<ApiResponse<{ status: string }>> {
    const response = await this.client.get('/sync/health');
    return response.data;
  }

  // Blockchain Verification
  async getBlockchainStatus(): Promise<ApiResponse<{ status: BlockchainStatus }>> {
    const response = await this.client.get('/blockchain/status');
    return response.data;
  }

  async getVerificationStats(): Promise<ApiResponse<{ stats: VerificationStats }>> {
    const response = await this.client.get('/blockchain/verification/stats');
    return response.data;
  }

  async registerEvidenceForBlockchain(evidenceId: string, filePath: string): Promise<ApiResponse<{
    fingerprint: string;
    blockchainVerification: unknown;
    integrityRecord: unknown;
  }>> {
    const response = await this.client.post('/blockchain/evidence/register', { evidenceId, filePath });
    return response.data;
  }

  async verifyEvidenceOnBlockchain(evidenceId: string, filePath: string): Promise<ApiResponse<VerificationResult>> {
    const response = await this.client.post('/blockchain/evidence/verify', { evidenceId, filePath });
    return response.data;
  }

  async batchVerifyEvidence(evidenceItems: Array<{ evidenceId: string; filePath: string }>): Promise<ApiResponse<BatchVerificationResult>> {
    const response = await this.client.post('/blockchain/evidence/batch-verify', { evidenceItems });
    return response.data;
  }

  async createEvidencePackage(
    investigationId: string,
    evidenceIds: string[],
    filePaths: string[]
  ): Promise<ApiResponse<unknown>> {
    const response = await this.client.post('/blockchain/package/create', {
      investigationId,
      evidenceIds,
      filePaths,
    });
    return response.data;
  }

  async verifyEvidencePackage(packageId: string): Promise<ApiResponse<PackageVerificationResult>> {
    const response = await this.client.post('/blockchain/package/verify', { packageId });
    return response.data;
  }

  async getBlockchainAuditLog(filters?: {
    evidenceId?: string;
    eventType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<ApiResponse<{ logs: BlockchainAuditEntry[] }>> {
    const response = await this.client.get('/blockchain/audit', { params: filters });
    return response.data;
  }

  async getInvestigationIntegrity(investigationId: string): Promise<ApiResponse<{ records: EvidenceIntegrityRecord[] }>> {
    const response = await this.client.get(`/blockchain/integrity/${investigationId}`);
    return response.data;
  }

  async getTamperAlerts(unacknowledged?: boolean): Promise<ApiResponse<{ alerts: TamperAlert[] }>> {
    const response = await this.client.get('/blockchain/alerts', { params: { unacknowledged } });
    return response.data;
  }

  async acknowledgeTamperAlert(evidenceId: string, alertId: string, notes?: string): Promise<ApiResponse<void>> {
    const response = await this.client.post(`/blockchain/alerts/${evidenceId}/${alertId}/acknowledge`, { notes });
    return response.data;
  }

  async getVerificationHistory(evidenceId: string): Promise<ApiResponse<{ history: unknown[] }>> {
    const response = await this.client.get(`/blockchain/verification/history/${evidenceId}`);
    return response.data;
  }

  async generateHash(data: string): Promise<ApiResponse<HashGenerationResult>> {
    const response = await this.client.post('/blockchain/hash/generate', { data });
    return response.data;
  }

async verifyHash(filePath: string, expectedHash: string): Promise<ApiResponse<HashVerificationResult>> {
    const response = await this.client.post('/blockchain/hash/verify', { filePath, expectedHash });
    return response.data;
  }

  // Reports
  async getReports(params?: {
    page?: number; limit?: number; simulator?: string;
    severity?: string; dateFrom?: string; dateTo?: string; search?: string;
  }): Promise<ApiResponse<ForensicReportSummary[]>> {
    const response = await this.client.get('/reports', { params });
    return response.data;
  }

  async getReport(id: string): Promise<ApiResponse<ForensicReportDetail>> {
    const response = await this.client.get(`/reports/${id}`);
    return response.data;
  }

  async exportReport(id: string, format: 'json' | 'text' = 'json'): Promise<Blob> {
    const response = await this.client.get(`/reports/${id}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  }

  // Logs
  async getLogs(params?: {
    page?: number; limit?: number; level?: string;
    category?: string; search?: string; since?: number;
  }): Promise<ApiResponse<LogEntry[]>> {
    const response = await this.client.get('/logs', { params });
    return response.data;
  }

  async getLogStats(): Promise<ApiResponse<{
    totalLines: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    files: string[];
  }>> {
    const response = await this.client.get('/logs/stats');
    return response.data;
  }

  // Settings
  async getSettings(): Promise<ApiResponse<AppSettings>> {
    const response = await this.client.get('/settings');
    return response.data;
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<ApiResponse<AppSettings>> {
    const response = await this.client.put('/settings', settings);
    return response.data;
  }

  async resetSettings(): Promise<ApiResponse<AppSettings>> {
    const response = await this.client.post('/settings/reset');
    return response.data;
  }

  // Evidence Artifacts
  async getEvidenceArtifacts(params?: {
    page?: number; limit?: number; category?: string; search?: string; source?: string;
  }): Promise<ApiResponse<EvidenceArtifact[]>> {
    const response = await this.client.get('/evidence/artifacts', { params });
    return response.data;
  }

  async getEvidenceArtifact(id: string): Promise<ApiResponse<ForensicEvidenceDetail>> {
    const response = await this.client.get(`/evidence/artifacts/${id}`);
    return response.data;
  }

  // Generic HTTP methods for flexibility
  async get<T = any>(path: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(path, { params });
    return response.data;
  }

  async post<T = any>(path: string, data?: unknown): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(path, data);
    return response.data;
  }

  async patch<T = any>(path: string, data?: unknown): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(path, data);
    return response.data;
  }
}

export const api = new ApiService();
export default api;
