/**
 * Analysis Store - Frontend State Management
 * Zustand store for AI Analysis and forensic intelligence
 */

import { create } from 'zustand';
import type {
  ComprehensiveForensicReport,
  SessionForensicAnalysis,
  SessionComparison,
  BehavioralPattern,
  Anomaly,
  CorrelationInsight,
  InvestigationCluster,
  AnalyticsDashboardData
} from '../types';
import api from '../services/api';

interface AnalysisState {
  // Dashboard data
  dashboardData: AnalyticsDashboardData | null;
  isLoadingDashboard: boolean;
  dashboardError: string | null;

  // Current analysis
  currentReport: ComprehensiveForensicReport | null;
  currentSessionAnalysis: SessionForensicAnalysis | null;
  isLoadingReport: boolean;
  reportError: string | null;

  // Session comparison
  comparisonResult: SessionComparison | null;
  selectedSessions: string[];
  isComparing: boolean;

  // Live session analysis
  liveSessionId: string | null;
  liveEvents: number;
  isLiveAnalyzing: boolean;

  // Behavioral patterns
  patterns: BehavioralPattern[];
  isLoadingPatterns: boolean;

  // Anomalies
  anomalies: Anomaly[];
  isLoadingAnomalies: boolean;

  // Insights
  insights: CorrelationInsight[];
  clusters: InvestigationCluster[];
  isLoadingInsights: boolean;

  // Generic error for analytics requests
  error: string | null;

  // Actions
  loadDashboard: () => Promise<void>;
  loadAnalysis: (investigationId: string) => Promise<void>;
  analyzeSession: (sessionId: string) => Promise<void>;
  compareSessions: (sessionIds: string[]) => Promise<void>;
  selectSessionForComparison: (sessionId: string) => void;
  clearComparison: () => void;
  startLiveAnalysis: (sessionId: string) => void;
  updateLiveEvents: (count: number) => void;
  stopLiveAnalysis: () => void;
  loadPatterns: () => Promise<void>;
  loadAnomalies: (evidenceId: string) => Promise<void>;
  loadInsights: (investigationId?: string) => Promise<void>;
  clearReport: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  // Initial state
  dashboardData: null,
  isLoadingDashboard: false,
  dashboardError: null,

  currentReport: null,
  currentSessionAnalysis: null,
  isLoadingReport: false,
  reportError: null,

  comparisonResult: null,
  selectedSessions: [],
  isComparing: false,

  liveSessionId: null,
  liveEvents: 0,
  isLiveAnalyzing: false,

  patterns: [],
  isLoadingPatterns: false,

  anomalies: [],
  isLoadingAnomalies: false,

  insights: [],
  clusters: [],
  isLoadingInsights: false,

  error: null,

  // Actions
  loadDashboard: async () => {
    set({ isLoadingDashboard: true, dashboardError: null });
    try {
      const response = await api.getAnalyticsDashboard();
      if (response.success && response.data) {
        set({ dashboardData: response.data, isLoadingDashboard: false });
      } else {
        set({ dashboardError: response.message, isLoadingDashboard: false });
      }
    } catch (error) {
      set({ dashboardError: 'Failed to load analytics dashboard', isLoadingDashboard: false });
    }
  },

  loadAnalysis: async (investigationId: string) => {
    set({ isLoadingReport: true, reportError: null, currentReport: null, currentSessionAnalysis: null });
    try {
      const response = await api.getComprehensiveForensicReport(investigationId);
      if (response.success && response.data) {
        set({ currentReport: response.data, isLoadingReport: false });
      } else {
        set({ reportError: response.message || 'Failed to load forensic report', isLoadingReport: false });
      }
    } catch (error) {
      set({ reportError: 'Failed to load forensic report', isLoadingReport: false });
    }
  },

  analyzeSession: async (sessionId: string) => {
    set({ isLoadingReport: true, reportError: null, currentSessionAnalysis: null });
    try {
      const response = await api.analyzeSessionForensic(sessionId);
      if (response.success && response.data) {
        set({ currentSessionAnalysis: response.data, currentReport: null, isLoadingReport: false });
      } else {
        set({ reportError: response.message || 'Failed to analyze session', isLoadingReport: false });
      }
    } catch (error) {
      set({ reportError: 'Failed to analyze session telemetry', isLoadingReport: false });
    }
  },

  compareSessions: async (sessionIds: string[]) => {
    set({ isComparing: true });
    try {
      const response = await api.compareSessions(sessionIds);
      if (response.success && response.data) {
        set({ comparisonResult: response.data, isComparing: false });
      } else {
        set({ reportError: response.message || 'Failed to compare sessions', isComparing: false });
      }
    } catch (error) {
      set({ reportError: 'Failed to compare sessions', isComparing: false });
    }
  },

  selectSessionForComparison: (sessionId: string) => {
    const { selectedSessions } = get();
    if (selectedSessions.includes(sessionId)) {
      set({ selectedSessions: selectedSessions.filter(id => id !== sessionId) });
    } else if (selectedSessions.length < 2) {
      set({ selectedSessions: [...selectedSessions, sessionId] });
    }
  },

  clearComparison: () => {
    set({ comparisonResult: null, selectedSessions: [] });
  },

  startLiveAnalysis: (sessionId: string) => {
    set({ liveSessionId: sessionId, liveEvents: 0, isLiveAnalyzing: true });
  },

  updateLiveEvents: (count: number) => {
    set({ liveEvents: count });
  },

  stopLiveAnalysis: () => {
    set({ liveSessionId: null, liveEvents: 0, isLiveAnalyzing: false, currentReport: null, currentSessionAnalysis: null, reportError: null });
  },

  loadPatterns: async () => {
    set({ isLoadingPatterns: true });
    try {
      const response = await api.getBehavioralPatterns();
      if (response.success && response.data) {
        set({ patterns: response.data.patterns || [], isLoadingPatterns: false, error: null });
      } else {
        set({ patterns: [], isLoadingPatterns: false, error: 'Failed to load patterns from API' });
      }
    } catch (error) {
      set({ patterns: [], isLoadingPatterns: false, error: 'Failed to load patterns from API' });
    }
  },

  loadAnomalies: async (evidenceId: string) => {
    set({ isLoadingAnomalies: true });
    try {
      const response = await api.detectAnomalies(evidenceId);
      if (response.success && response.data) {
        set({ anomalies: response.data.anomalies || [], isLoadingAnomalies: false, error: null });
      } else {
        set({ anomalies: [], isLoadingAnomalies: false, error: 'Failed to load anomalies from API' });
      }
    } catch (error) {
      set({ anomalies: [], isLoadingAnomalies: false, error: 'Failed to load anomalies from API' });
    }
  },

  loadInsights: async (investigationId?: string) => {
    set({ isLoadingInsights: true });
    try {
      const [insightsRes, clustersRes] = await Promise.all([
        api.getCorrelationInsights(investigationId),
        api.getInvestigationClusters()
      ]);
      set({
        insights: insightsRes.data?.insights || [],
        clusters: clustersRes.data?.clusters || [],
        isLoadingInsights: false,
        error: null,
      });
    } catch (error) {
      set({
        insights: [],
        clusters: [],
        isLoadingInsights: false,
        error: 'Failed to load insights from API',
      });
    }
  },

  clearReport: () => {
    set({
      currentReport: null,
      currentSessionAnalysis: null,
      reportError: null
    });
  }
}));

export default useAnalysisStore;
