import { create } from 'zustand';
import type { SandboxSession, PaginationParams } from '../types';
import api from '../services/api';

interface Simulator {
  id: string;
  display_name: string;
  description: string;
  category: string;
}

interface RuntimeHealth {
  status: string;
  version: string;
  uptime_seconds: number;
  vm_status: Record<string, any>;
  active_sessions: number;
  telemetry_connections: number;
}

interface MonitoringStatus {
  enabled: boolean;
  total_events?: number;
  process_count?: number;
  file_operations_count?: number;
  registry_operations_count?: number;
  network_operations_count?: number;
  behavior_alerts?: number;
  suspicious_activities?: unknown[];
  events_by_category?: Record<string, number>;
  events_by_severity?: Record<string, number>;
}

interface ExecutionStatus {
  history_count: number;
  current_session: unknown;
  recent_sessions: Array<{
    session_id: string;
    status: string;
    simulator_id: string;
  }>;
}

interface TelemetryEvent {
  session_id: string;
  timestamp: string;
  event_type: string;
  category: string;
  data: Record<string, any>;
}

interface LogEntry {
  timestamp: string;
  message: string;
  level: string;
}

interface ActiveSession {
  session_id: string;
  state: string;
  simulator_id: string;
  created_at: string;
  updated_at: string;
  error?: string;
}

interface SandboxState {
  sessions: SandboxSession[];
  currentSession: SandboxSession | null;
  stats: {
    total: number;
    byStatus: Record<string, number>;
    avgDuration: number;
  } | null;
  simulators: Simulator[];
  health: RuntimeHealth | null;
  monitoringStatus: MonitoringStatus | null;
  executionStatus: ExecutionStatus | null;
  activeSession: ActiveSession | null;
  telemetryEvents: TelemetryEvent[];
  logs: LogEntry[];
  isLoading: boolean;
  isExecuting: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  fetchSessions: (params: PaginationParams) => Promise<void>;
  fetchSession: (id: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchSimulators: () => Promise<void>;
  fetchHealth: () => Promise<void>;
  startSession: (simulatorId: string, options?: { auto_rollback?: boolean; timeout_seconds?: number }) => Promise<{ success: boolean; sessionId?: string; message: string }>;
  stopSession: (sessionId: string) => Promise<{ success: boolean; message: string }>;
  terminateSession: (sessionId: string) => Promise<{ success: boolean; message: string }>;
  resetVm: () => Promise<{ success: boolean; message: string }>;
  startRuntime: () => Promise<{ success: boolean; message: string }>;
  connectTelemetry: () => void;
  disconnectTelemetry: () => void;
  launchAgent: () => Promise<{ success: boolean; message: string }>;
  clearCurrentSession: () => void;
  clearTelemetry: () => void;
}

let ws: WebSocket | null = null;

export const useSandboxStore = create<SandboxState>((set, get) => ({
  sessions: [],
  currentSession: null,
  stats: null,
  simulators: [],
  health: null,
  monitoringStatus: null,
  executionStatus: null,
  activeSession: null,
  telemetryEvents: [],
  logs: [],
  isLoading: false,
  isExecuting: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

  fetchSessions: async (params: PaginationParams) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getSandboxSessions(params);
      if (response.success && response.data) {
        set({
          sessions: response.data,
          pagination: {
            page: response.meta?.page || 1,
            limit: response.meta?.limit || 20,
            total: response.meta?.total || 0,
            totalPages: response.meta?.totalPages || 0,
          },
          isLoading: false,
        });
      }
    } catch (error) {
      set({ isLoading: false, error: 'Failed to fetch sandbox sessions' });
    }
  },

  fetchSession: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getSandboxSession(id);
      if (response.success && response.data) {
        set({ currentSession: response.data, isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false, error: 'Failed to fetch sandbox session' });
    }
  },

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getSandboxStats();
      if (response.success && response.data) {
        set({ stats: response.data, isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false, error: 'Failed to fetch sandbox stats' });
    }
  },

  fetchSimulators: async () => {
    try {
      const response = await api.getSandboxSimulators();
      if (response.success && response.data?.simulators) {
        set({ simulators: response.data.simulators });
      }
    } catch (error) {
      console.error('Failed to fetch simulators:', error);
    }
  },

  fetchHealth: async () => {
    try {
      const response = await api.getSandboxHealth();
      if (response.success && response.data?.health) {
        set({ health: response.data.health });
      }
    } catch (error) {
      console.error('Failed to fetch sandbox health:', error);
    }
  },

  fetchMonitoringStatus: async () => {
    try {
      const response = await api.getSandboxMonitoringStatus();
      if (response.success && response.data?.status) {
        set({ monitoringStatus: response.data.status });
      }
    } catch (error) {
      console.error('Failed to fetch monitoring status:', error);
    }
  },

  fetchExecutionStatus: async () => {
    try {
      const response = await api.getSandboxExecutionStatus();
      if (response.success && response.data?.status) {
        set({ executionStatus: response.data.status });
      }
    } catch (error) {
      console.error('Failed to fetch execution status:', error);
    }
  },

  fetchLogs: async (limit: number = 200, level?: string) => {
    try {
      const response = await api.getSandboxLogs(limit, level);
      if (response.success && response.data?.logs) {
        set({ logs: response.data.logs });
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  },

  clearLogs: () => set({ logs: [] }),

  startSession: async (simulatorId: string, options = {}) => {
    set({ isExecuting: true, error: null });
    try {
      const response = await api.startSandboxSession({
        simulator_id: simulatorId,
        auto_rollback: options.auto_rollback ?? true,
        timeout_seconds: options.timeout_seconds ?? 300,
      });

      if (response.success && response.data?.session) {
        const session = response.data.session;
        set({
          activeSession: session,
          isExecuting: false,
        });
        return { success: true, sessionId: session.session_id, message: 'Session started' };
      }

      set({ isExecuting: false, error: response.message || 'Failed to start session' });
      return { success: false, message: response.message || 'Failed to start session' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start session';
      set({ isExecuting: false, error: message });
      return { success: false, message };
    }
  },

  stopSession: async (sessionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.stopSandboxSession(sessionId);
      if (response.success) {
        set({ isLoading: false });
        return { success: true, message: 'Session stopped' };
      }
      set({ isLoading: false, error: response.message || 'Failed to stop session' });
      return { success: false, message: response.message || 'Failed to stop session' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to stop session';
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  terminateSession: async (sessionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.terminateSandboxSession(sessionId);
      if (response.success) {
        set({ isLoading: false, activeSession: null });
        return { success: true, message: 'Session terminated and rolled back' };
      }
      set({ isLoading: false, error: response.message || 'Failed to terminate session' });
      return { success: false, message: response.message || 'Failed to terminate session' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to terminate session';
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  resetVm: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.resetSandboxVm();
      if (response.success) {
        set({ isLoading: false });
        return { success: true, message: 'VM reset successfully' };
      }
      set({ isLoading: false, error: response.message || 'Failed to reset VM' });
      return { success: false, message: response.message || 'Failed to reset VM' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset VM';
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  startRuntime: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.startSandboxRuntime();
      if (response.success) {
        set({ isLoading: false });
        await new Promise(resolve => setTimeout(resolve, 3000));
        await get().fetchHealth();
        return { success: true, message: 'Runtime started successfully' };
      }
      set({ isLoading: false, error: response.message || 'Failed to start runtime' });
      return { success: false, message: response.message || 'Failed to start runtime' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start runtime';
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  connectTelemetry: () => {
    const { disconnectTelemetry } = get();
    disconnectTelemetry();

    api.getSandboxTelemetryUrl().then((response) => {
      if (response.success && response.data?.url) {
        const wsUrl = response.data.url;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('Telemetry WebSocket connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as TelemetryEvent;
            set((state) => ({
              telemetryEvents: [...state.telemetryEvents.slice(-99), data],
            }));
          } catch (e) {
            console.error('Failed to parse telemetry event:', e);
          }
        };

        ws.onerror = (error) => {
          console.error('Telemetry WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('Telemetry WebSocket disconnected');
        };
      }
    }).catch(console.error);
  },

  disconnectTelemetry: () => {
    if (ws) {
      ws.close();
      ws = null;
    }
  },

  launchAgent: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.launchSandboxAgent();
      if (response.success) {
        set({ isLoading: false });
        return { success: true, message: 'Sandbox agent launched successfully' };
      }
      set({ isLoading: false, error: response.message || 'Failed to launch agent' });
      return { success: false, message: response.message || 'Failed to launch agent' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to launch sandbox agent';
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  clearCurrentSession: () => set({ currentSession: null, activeSession: null }),
  clearTelemetry: () => set({ telemetryEvents: [] }),
}));