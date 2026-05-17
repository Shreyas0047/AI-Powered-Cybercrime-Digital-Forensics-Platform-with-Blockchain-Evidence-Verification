/**
 * Custody Store - Frontend State Management
 * Zustand store for chain of custody and integrity management
 */

import { create } from 'zustand';
import api from '../services/api';

interface CustodyEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  performedByName: string;
  details: string;
  integrityStatus?: string;
  transactionHash?: string;
}

interface ChainOfCustody {
  evidenceId: string;
  chainId: string;
  events: CustodyEvent[];
  integrityStatus: string;
  blockchainVerified: boolean;
}

interface IntegrityStats {
  totalEvidence: number;
  verified: number;
  pending: number;
  failed: number;
  tamperSuspected: number;
  blockchainOnChain: number;
}

interface TamperInvestigation {
  investigationId: string;
  evidenceId: string;
  severity: string;
  expectedHash: string;
  actualHash: string;
  status: string;
  detectedAt: string;
}

interface VerificationReport {
  reportId: string;
  reportType: string;
  generatedAt: string;
  summary: {
    totalEvidence: number;
    verifiedEvidence: number;
    failedEvidence: number;
    pendingEvidence: number;
    tamperDetected: number;
  };
}

interface LineageGraph {
  nodes: Array<{ id: string; type: string; label: string }>;
  edges: Array<{ source: string; target: string; relationship: string }>;
}

interface CustodyState {
  // Data
  chainOfCustody: ChainOfCustody | null;
  integrityStats: IntegrityStats | null;
  tamperInvestigations: TamperInvestigation[];
  verificationHistory: any[];
  reports: VerificationReport[];

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchChainOfCustody: (evidenceId: string) => Promise<void>;
  fetchIntegrityStats: () => Promise<void>;
  fetchTamperInvestigations: () => Promise<void>;
  fetchVerificationHistory: (evidenceId: string) => Promise<void>;
  addCustodyEvent: (evidenceId: string, eventType: string, details: string, investigationId?: string) => Promise<void>;
  transferCustody: (evidenceId: string, newHolderId: string, newHolderName: string) => Promise<void>;
  createTamperInvestigation: (evidenceId: string, expectedHash: string, actualHash: string, severity: string) => Promise<void>;
  generateReport: (investigationId: string, evidenceIds: string[], reportType: string) => Promise<void>;
  fetchLineageGraph: (investigationId: string) => Promise<LineageGraph>;
  clearError: () => void;
}

export const useCustodyStore = create<CustodyState>((set, get) => ({
  // Initial state
  chainOfCustody: null,
  integrityStats: null,
  tamperInvestigations: [],
  verificationHistory: [],
  reports: [],
  isLoading: false,
  error: null,

  // Fetch chain of custody
  fetchChainOfCustody: async (evidenceId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/custody/chain/${evidenceId}`);
      if (response.success && response.data.chain) {
        set({ chainOfCustody: response.data.chain, isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false, error: 'Failed to fetch chain of custody' });
    }
  },

  // Fetch integrity stats
  fetchIntegrityStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/custody/integrity-stats');
      if (response.success && response.data) {
        set({ integrityStats: response.data.stats, isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false, error: 'Failed to fetch integrity stats' });
    }
  },

  // Fetch tamper investigations
  fetchTamperInvestigations: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/custody/tamper-investigations');
      if (response.success && response.data) {
        set({ tamperInvestigations: response.data.investigations, isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false, error: 'Failed to fetch tamper investigations' });
    }
  },

  // Fetch verification history
  fetchVerificationHistory: async (evidenceId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/custody/verification-history/${evidenceId}`);
      if (response.success && response.data) {
        set({ verificationHistory: response.data.history, isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false, error: 'Failed to fetch verification history' });
    }
  },

  // Add custody event
  addCustodyEvent: async (evidenceId, eventType, details, investigationId) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/custody/event', { evidenceId, eventType, details, investigationId });
      // Refresh chain
      await get().fetchChainOfCustody(evidenceId);
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: 'Failed to add custody event' });
      throw error;
    }
  },

  // Transfer custody
  transferCustody: async (evidenceId, newHolderId, newHolderName) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/custody/transfer', { evidenceId, newHolderId, newHolderName });
      await get().fetchChainOfCustody(evidenceId);
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: 'Failed to transfer custody' });
      throw error;
    }
  },

  // Create tamper investigation
  createTamperInvestigation: async (evidenceId, expectedHash, actualHash, severity) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/custody/tamper-investigation', {
        evidenceId, expectedHash, actualHash, severity,
      });
      if (response.success) {
        await get().fetchTamperInvestigations();
      }
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: 'Failed to create tamper investigation' });
      throw error;
    }
  },

  // Generate report
  generateReport: async (investigationId, evidenceIds, reportType) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/custody/report', {
        investigationId, evidenceIds, reportType,
      });
      if (response.success && response.data.report) {
        set({ reports: [...get().reports, response.data.report], isLoading: false });
        return response.data.report;
      }
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: 'Failed to generate report' });
      throw error;
    }
  },

  // Fetch lineage graph
  fetchLineageGraph: async (investigationId) => {
    try {
      const response = await api.get(`/custody/lineage-graph/${investigationId}`);
      if (response.success && response.data) {
        return response.data;
      }
      return { nodes: [], edges: [] };
    } catch {
      return { nodes: [], edges: [] };
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));