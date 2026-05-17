/**
 * Threat Store - Frontend State Management
 * Zustand store for threat intelligence and IOC management
 */

import { create } from 'zustand';
import api from '../services/api';

interface IOC {
  iocId: string;
  type: string;
  value: string;
  severity: string;
  status: string;
  category: string;
  description?: string;
  threatScore: number;
  confidence: number;
  mitreTactics: string[];
  tags: string[];
  linkedEvidence: string[];
  linkedInvestigations: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
}

interface ThreatCorrelation {
  correlationId: string;
  correlationType: string;
  entities: Array<{
    entityType: string;
    entityId: string;
    entityValue: string;
  }>;
  strength: number;
  description: string;
  status: string;
  detectedAt: string;
}

interface ThreatStats {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  recentActivity: IOC[];
}

interface ThreatEnrichment {
  matchedIocs: Array<{
    iocId: string;
    iocType: string;
    iocValue: string;
    severity: string;
    confidence: number;
  }>;
  relatedEntities: Array<{
    entityType: string;
    entityId: string;
    relationship: string;
    relevanceScore: number;
  }>;
  behavioralContext: {
    pattern: string;
    anomalies: string[];
    riskIndicators: string[];
  };
  threatContext: {
    associatedMalware: string[];
    associatedTTPs: string[];
  };
}

interface ThreatGraph {
  nodes: Array<{ id: string; type: string; label: string; metadata: any }>;
  edges: Array<{ source: string; target: string; relationship: string }>;
}

interface ThreatState {
  // Data
  iocs: IOC[];
  correlations: ThreatCorrelation[];
  selectedIOC: IOC | null;
  threatStats: ThreatStats | null;
  lastEnrichment: ThreatEnrichment | null;
  threatGraph: ThreatGraph | null;

  // Loading states
  isLoading: boolean;
  error: string | null;
  totalIOCs: number;

  // Filters
  filters: {
    type?: string;
    severity?: string;
    status?: string;
    category?: string;
    search?: string;
  };

  // Actions
  createIOC: (input: Partial<IOC>) => Promise<IOC>;
  fetchIOC: (iocId: string) => Promise<void>;
  searchIOCs: (filters?: Partial<ThreatState['filters']>) => Promise<void>;
  updateIOCStatus: (iocId: string, status: string) => Promise<void>;
  linkIOCToEvidence: (iocId: string, evidenceId: string) => Promise<void>;
  matchIOCs: (evidenceHashes: string[]) => Promise<IOC[]>;
  correlateEvidence: (evidenceId: string) => Promise<{
    correlations: ThreatCorrelation[];
    relatedIocs: IOC[];
    linkedInvestigations: any[];
  }>;
  createCorrelation: (input: {
    correlationType: string;
    entities: Array<{ entityType: string; entityId: string; entityValue: string }>;
    strength: number;
    description: string;
  }) => Promise<ThreatCorrelation>;
  enrichInvestigation: (investigationId: string) => Promise<ThreatEnrichment>;
  fetchThreatStats: () => Promise<void>;
  fetchThreatGraph: (investigationId?: string) => Promise<void>;
  setFilters: (filters: Partial<ThreatState['filters']>) => void;
  clearError: () => void;
}

export const useThreatStore = create<ThreatState>((set, get) => ({
  // Initial state
  iocs: [],
  correlations: [],
  selectedIOC: null,
  threatStats: null,
  lastEnrichment: null,
  threatGraph: null,
  isLoading: false,
  error: null,
  totalIOCs: 0,
  filters: {},

  // Create IOC
  createIOC: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/threat/ioc', input);
      if (response.success && response.data.ioc) {
        set({ iocs: [response.data.ioc, ...get().iocs], isLoading: false });
        return response.data.ioc;
      }
      throw new Error('Failed to create IOC');
    } catch (error) {
      set({ isLoading: false, error: 'Failed to create IOC' });
      throw error;
    }
  },

  // Fetch IOC
  fetchIOC: async (iocId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/threat/ioc/${iocId}`);
      if (response.success && response.data.ioc) {
        set({ selectedIOC: response.data.ioc, isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false, error: 'Failed to fetch IOC' });
    }
  },

  // Search IOCs
  searchIOCs: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.severity) params.append('severity', filters.severity);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.search) params.append('search', filters.search);

      const response = await api.get(`/threat/iocs?${params.toString()}`);
      if (response.success && response.data) {
        set({
          iocs: response.data.iocs,
          totalIOCs: response.data.total,
          isLoading: false,
        });
      }
    } catch (error) {
      set({ isLoading: false, error: 'Failed to search IOCs' });
    }
  },

  // Update IOC status
  updateIOCStatus: async (iocId, status) => {
    set({ isLoading: true, error: null });
    try {
      await api.patch(`/threat/ioc/${iocId}/status`, { status });
      // Refresh list
      await get().searchIOCs(get().filters);
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: 'Failed to update IOC status' });
      throw error;
    }
  },

  // Link IOC to evidence
  linkIOCToEvidence: async (iocId, evidenceId) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/threat/ioc/link', { iocId, evidenceId });
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: 'Failed to link IOC' });
      throw error;
    }
  },

  // Match IOCs
  matchIOCs: async (evidenceHashes) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/threat/ioc/match', { evidenceHashes });
      if (response.success && response.data) {
        set({ isLoading: false });
        return response.data.matched || [];
      }
      set({ isLoading: false });
      return [];
    } catch (error) {
      set({ isLoading: false, error: 'Failed to match IOCs' });
      return [];
    }
  },

  // Correlate evidence
  correlateEvidence: async (evidenceId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/threat/correlation/${evidenceId}`);
      if (response.success && response.data) {
        set({
          correlations: response.data.correlations || [],
          iocs: [...get().iocs, ...(response.data.relatedIocs || [])].filter((v, i, a) =>
            a.findIndex(t => t.iocId === v.iocId) === i),
          isLoading: false,
        });
        return response.data;
      }
      set({ isLoading: false });
      return { correlations: [], relatedIocs: [], linkedInvestigations: [] };
    } catch (error) {
      set({ isLoading: false, error: 'Failed to correlate evidence' });
      return { correlations: [], relatedIocs: [], linkedInvestigations: [] };
    }
  },

  // Create correlation
  createCorrelation: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/threat/correlation', input);
      if (response.success && response.data.correlation) {
        set({ correlations: [...get().correlations, response.data.correlation], isLoading: false });
        return response.data.correlation;
      }
      throw new Error('Failed to create correlation');
    } catch (error) {
      set({ isLoading: false, error: 'Failed to create correlation' });
      throw error;
    }
  },

  // Enrich investigation
  enrichInvestigation: async (investigationId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post(`/threat/enrich/${investigationId}`);
      if (response.success && response.data) {
        set({ lastEnrichment: response.data, isLoading: false });
        return response.data;
      }
      throw new Error('Failed to enrich investigation');
    } catch (error) {
      set({ isLoading: false, error: 'Failed to enrich investigation' });
      throw error;
    }
  },

  // Fetch stats
  fetchThreatStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/threat/stats');
      if (response.success && response.data.stats) {
        set({ threatStats: response.data.stats, isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false, error: 'Failed to fetch stats' });
    }
  },

  // Fetch threat graph
  fetchThreatGraph: async (investigationId) => {
    set({ isLoading: true, error: null });
    try {
      const params = investigationId ? `?investigationId=${investigationId}` : '';
      const response = await api.get(`/threat/graph${params}`);
      if (response.success && response.data) {
        set({ threatGraph: response.data, isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false, error: 'Failed to fetch threat graph' });
    }
  },

  // Set filters
  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  // Clear error
  clearError: () => set({ error: null }),
}));