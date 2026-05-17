import { create } from 'zustand';
import type { SandboxSession, PaginationParams } from '../types';
import api from '../services/api';

interface SandboxState {
  sessions: SandboxSession[];
  currentSession: SandboxSession | null;
  stats: {
    total: number;
    byStatus: Record<string, number>;
    avgDuration: number;
  } | null;
  isLoading: boolean;
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
  clearCurrentSession: () => void;
}

export const useSandboxStore = create<SandboxState>((set) => ({
  sessions: [],
  currentSession: null,
  stats: null,
  isLoading: false,
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

  clearCurrentSession: () => set({ currentSession: null }),
}));