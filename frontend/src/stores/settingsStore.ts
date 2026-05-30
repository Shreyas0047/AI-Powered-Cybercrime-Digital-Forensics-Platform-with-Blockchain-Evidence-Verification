import { create } from 'zustand';
import type { AppSettings } from '../types/reports';
import api from '../services/api';

const DEFAULT_SETTINGS: AppSettings = {
  vm: {
    vmName: 'ForensicsSandbox',
    snapshotName: 'CleanBaselinePython',
    headlessMode: false,
    startupTimeout: 60,
    shutdownTimeout: 30,
  },
  monitoring: {
    enabled: true,
    pollingInterval: 5000,
    processEnabled: true,
    fileEnabled: true,
    registryEnabled: true,
    networkEnabled: true,
    behaviorEnabled: true,
    logRetentionDays: 30,
  },
  execution: {
    timeout: 300,
    autoRollback: true,
    maxConcurrentSessions: 1,
    telemetryLimit: 10000,
  },
  logging: {
    level: 'info',
    maxFileSize: '10m',
    maxFiles: 30,
  },
  notifications: {
    alertsEnabled: true,
    alertOnCompletion: true,
    alertOnError: true,
    webhookUrl: '',
  },
};

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  success: string | null;
  validationErrors: string[];
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<boolean>;
  resetSettings: () => Promise<void>;
  clearMessages: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  isSaving: false,
  error: null,
  success: null,
  validationErrors: [],

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getSettings();
      if (response.success && response.data) {
        set({ settings: response.data, isLoading: false });
      } else {
        set({ isLoading: false, error: 'Failed to load settings' });
      }
    } catch {
      set({ isLoading: false, error: 'Failed to load settings' });
    }
  },

  updateSettings: async (updates) => {
    set({ isSaving: true, error: null, success: null, validationErrors: [] });
    try {
      const response = await api.updateSettings(updates);
      if (response.success && response.data) {
        set({ settings: response.data, isSaving: false, success: 'Settings saved successfully' });
        setTimeout(() => set({ success: null }), 3000);
        return true;
      } else {
        set({ isSaving: false, error: 'Failed to save settings' });
        return false;
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { errors?: Array<{ message: string }> } } };
      const validationErrors = error?.response?.data?.errors?.map(e => e.message) || [];
      set({
        isSaving: false,
        error: validationErrors.length > 0 ? 'Validation failed' : 'Failed to save settings',
        validationErrors,
      });
      return false;
    }
  },

  resetSettings: async () => {
    set({ isSaving: true, error: null, success: null });
    try {
      const response = await api.resetSettings();
      if (response.success && response.data) {
        set({ settings: response.data, isSaving: false, success: 'Settings reset to defaults' });
        setTimeout(() => set({ success: null }), 3000);
      } else {
        set({ isSaving: false, error: 'Failed to reset settings' });
      }
    } catch {
      set({ isSaving: false, error: 'Failed to reset settings' });
    }
  },

  clearMessages: () => set({ error: null, success: null, validationErrors: [] }),
}));
