import { create } from 'zustand';
import type { Alert, PaginationParams } from '../types';
import api from '../services/api';

interface AlertState {
  alerts: Alert[];
  currentAlert: Alert | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  fetchAlerts: (params: PaginationParams) => Promise<void>;
  fetchAlert: (id: string) => Promise<void>;
  acknowledgeAlert: (id: string) => Promise<void>;
  resolveAlert: (id: string, resolution: Record<string, unknown>) => Promise<void>;
  clearCurrentAlert: () => void;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  currentAlert: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

  fetchAlerts: async (params: PaginationParams) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getAlerts(params);
      if (response.success && response.data) {
        set({
          alerts: response.data,
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
      set({
        isLoading: false,
        error: 'Failed to fetch alerts',
      });
    }
  },

  fetchAlert: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getAlert(id);
      if (response.success && response.data) {
        set({
          currentAlert: response.data,
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error: 'Failed to fetch alert',
      });
    }
  },

  acknowledgeAlert: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.acknowledgeAlert(id);
      if (response.success && response.data) {
        const alerts = get().alerts.map((alert) =>
          alert.id === id ? response.data : alert
        ).filter((alert): alert is Alert => alert !== undefined);
        set({
          alerts,
          currentAlert: response.data,
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error: 'Failed to acknowledge alert',
      });
    }
  },

  resolveAlert: async (id: string, resolution: Record<string, unknown>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.resolveAlert(id, resolution);
      if (response.success && response.data) {
        const alerts = get().alerts.map((alert) =>
          alert.id === id ? response.data : alert
        ).filter((alert): alert is Alert => alert !== undefined);
        set({
          alerts,
          currentAlert: response.data,
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error: 'Failed to resolve alert',
      });
    }
  },

  clearCurrentAlert: () => set({ currentAlert: null }),
}));