import { create } from 'zustand';
import type { LogEntry } from '../types/reports';
import api from '../services/api';

interface LogsState {
  logs: LogEntry[];
  isLoading: boolean;
  error: string | null;
  pagination: { page: number; limit: number; total: number };
  filters: {
    level: string;
    category: string;
    search: string;
  };
  autoRefresh: boolean;
  stats: {
    totalLines: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    files: string[];
  } | null;
  fetchLogs: (params?: Partial<LogsState['filters'] & { page: number; limit: number }>) => Promise<void>;
  fetchStats: () => Promise<void>;
  setFilters: (filters: Partial<LogsState['filters']>) => void;
  toggleAutoRefresh: () => void;
  clearLogs: () => void;
  downloadLogs: () => void;
}

export const useLogsStore = create<LogsState>((set, get) => ({
  logs: [],
  isLoading: false,
  error: null,
  pagination: { page: 1, limit: 200, total: 0 },
  filters: { level: '', category: '', search: '' },
  autoRefresh: false,
  stats: null,

  fetchLogs: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const { filters, pagination } = get();
      const merged = { ...filters, ...params };
      const page = merged.page ?? pagination.page;
      const limit = merged.limit ?? pagination.limit;

      const response = await api.getLogs({
        page,
        limit,
        level: merged.level || undefined,
        category: merged.category || undefined,
        search: merged.search || undefined,
      });

      if (response.success && response.data) {
        set({
          logs: response.data,
          pagination: {
            page: response.meta?.page || page,
            limit: response.meta?.limit || limit,
            total: response.meta?.total || 0,
          },
          isLoading: false,
        });
      } else {
        set({ isLoading: false, error: 'Failed to load logs' });
      }
    } catch {
      set({ isLoading: false, error: 'Failed to load logs' });
    }
  },

  fetchStats: async () => {
    try {
      const response = await api.getLogStats();
      if (response.success && response.data) {
        set({ stats: response.data });
      }
    } catch {
      // silent fail for stats
    }
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  toggleAutoRefresh: () => {
    set((state) => ({ autoRefresh: !state.autoRefresh }));
  },

  clearLogs: () => set({ logs: [] }),

  downloadLogs: () => {
    const { logs } = get();
    if (logs.length === 0) return;

    const content = logs
      .map(l => `[${l.level.toUpperCase()}] ${l.timestamp} [${l.category}] ${l.message}`)
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${new Date().toISOString().split('T')[0]}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
}));