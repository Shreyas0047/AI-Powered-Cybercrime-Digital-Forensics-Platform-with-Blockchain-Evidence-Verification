/**
 * Sandbox Runtime Service
 * Communicates with the headless sandbox runtime API
 */

import axios, { AxiosInstance } from 'axios';
import { AppError } from '../middleware';

export interface RuntimeHealth {
  status: string;
  version: string;
  uptime_seconds: number;
  vm_status: Record<string, any>;
  active_sessions: number;
  telemetry_connections: number;
}

export interface SimulatorInfo {
  id: string;
  display_name: string;
  description: string;
  category: string;
}

export interface RuntimeSession {
  session_id: string;
  state: string;
  simulator_id: string;
  created_at: string;
  updated_at: string;
  error?: string;
}

export interface StartSessionRequest {
  simulator_id: string;
  auto_rollback: boolean;
  timeout_seconds: number;
}

let runtimeStarted = false;
let runtimeCheckInProgress = false;

export class SandboxRuntimeService {
  private client: AxiosInstance;
  private baseUrl: string;
  private sessionMonitors: Map<string, boolean> = new Map();

  constructor() {
    this.baseUrl = process.env.SANDBOX_RUNTIME_URL || 'http://127.0.0.1:8765';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Secret': process.env.SANDBOX_AGENT_SECRET || '',
      },
    });
  }

  async monitorSessionCompletion(
    sessionId: string,
    onComplete: (session: RuntimeSession) => Promise<void>,
  ): Promise<void> {
    if (this.sessionMonitors.has(sessionId)) return;
    this.sessionMonitors.set(sessionId, true);

    const poll = async (attempts: number) => {
      if (!this.sessionMonitors.has(sessionId)) return;
      if (attempts >= 90) {
        this.sessionMonitors.delete(sessionId);
        return;
      }
      try {
        const session = await this.getSession(sessionId);
        const state = session.state.toUpperCase();
        if (state === 'COMPLETED' || state === 'FAILED') {
          this.sessionMonitors.delete(sessionId);
          await onComplete(session);
          return;
        }
      } catch {
        // retry
      }
      setTimeout(() => poll(attempts + 1), 3000);
    };

    setTimeout(() => poll(0), 3000);
  }

  private async ensureRuntimeStarted(): Promise<void> {
    if (runtimeStarted) return;
    if (runtimeCheckInProgress) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      return;
    }

    runtimeCheckInProgress = true;

    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await this.client.get('/health', { timeout: 3000 });
          runtimeStarted = true;
          return;
        } catch {
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      // Runtime is not reachable — do NOT auto-spawn; operator must start manually
    } finally {
      runtimeCheckInProgress = false;
    }
  }

  private handleError(error: any): never {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        throw new AppError('Sandbox runtime service is not running. Click "Start Runtime" in the UI or run the sandbox runtime manually.', 503, 'RUNTIME_UNAVAILABLE');
      }
      throw new AppError(
        error.response?.data?.detail || error.message,
        error.response?.status || 500,
        'RUNTIME_ERROR'
      );
    }
    throw new AppError('Unknown error communicating with sandbox runtime', 500, 'RUNTIME_ERROR');
  }

  async getHealth(): Promise<RuntimeHealth> {
    try {
      if (!runtimeStarted) {
        await this.ensureRuntimeStarted();
      }
      const response = await this.client.get<RuntimeHealth>('/health');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.get('/health', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async listSimulators(): Promise<SimulatorInfo[]> {
    try {
      const response = await this.client.get<SimulatorInfo[]>('/simulators');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async startSession(request: StartSessionRequest): Promise<RuntimeSession> {
    try {
      if (!runtimeStarted) {
        await this.ensureRuntimeStarted();
      }
      const response = await this.client.post<RuntimeSession>('/sessions/start', request, {
        timeout: 15000,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getSession(sessionId: string): Promise<RuntimeSession> {
    try {
      if (!runtimeStarted) {
        await this.ensureRuntimeStarted();
      }
      const response = await this.client.get<RuntimeSession>(`/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getSessionEvents(sessionId: string): Promise<{ events: any[] }> {
    try {
      if (!runtimeStarted) {
        await this.ensureRuntimeStarted();
      }
      const response = await this.client.get<{ events: any[] }>(`/sessions/${sessionId}/events`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async listSessions(): Promise<RuntimeSession[]> {
    try {
      const response = await this.client.get<RuntimeSession[]>('/sessions');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

async stopSession(sessionId: string): Promise<RuntimeSession> {
    try {
      const response = await this.client.post<RuntimeSession>(`/sessions/${sessionId}/stop`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async terminateSession(sessionId: string): Promise<RuntimeSession> {
    try {
      const response = await this.client.post<RuntimeSession>(`/sessions/${sessionId}/terminate`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getLogs(limit: number = 100, level?: string): Promise<{ logs: Array<{ timestamp: string; message: string; level: string }> }> {
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (level) params.append('level', level);
      const response = await this.client.get<{ logs: Array<{ timestamp: string; message: string; level: string }> }>(`/logs?${params}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  getTelemetryUrl(): string {
    return `${this.baseUrl.replace('http', 'ws')}/telemetry/live`;
  }

  getLogsUrl(): string {
    return `${this.baseUrl.replace('http', 'ws')}/logs/live`;
  }

  async resetVm(): Promise<{ status: string; message: string }> {
    try {
      const response = await this.client.post<{ status: string; message: string }>('/vm/reset');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getVmStatus(): Promise<Record<string, any>> {
    try {
      const response = await this.client.get<Record<string, any>>('/vm/status');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMonitoringStatus(): Promise<Record<string, any>> {
    try {
      const response = await this.client.get<Record<string, any>>('/monitoring/status');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getExecutionStatus(): Promise<Record<string, any>> {
    try {
      const response = await this.client.get<Record<string, any>>('/execution/status');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

export const sandboxRuntimeService = new SandboxRuntimeService();
export default sandboxRuntimeService;
