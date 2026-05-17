import { create } from 'zustand';
import type { TelemetryEvent, TelemetryEventType } from '../types';

export interface AnalystNote {
  id: string;
  investigationId: string;
  content: string;
  type: 'observation' | 'finding' | 'conclusion' | 'remediation' | 'escalation';
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt?: string;
}

interface TimelineState {
  events: TelemetryEvent[];
  notes: AnalystNote[];
  isLoading: boolean;
  error: string | null;
  filters: {
    types: TelemetryEventType[];
    severity: string[];
    search: string;
    dateRange: { start: string | null; end: string | null };
  };
  setEvents: (events: TelemetryEvent[]) => void;
  addNote: (note: Omit<AnalystNote, 'id' | 'createdAt'>) => void;
  updateNote: (id: string, content: string) => void;
  deleteNote: (id: string) => void;
  setFilters: (filters: Partial<TimelineState['filters']>) => void;
  clearFilters: () => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  events: [],
  notes: [],
  isLoading: false,
  error: null,
  filters: {
    types: [],
    severity: [],
    search: '',
    dateRange: { start: null, end: null },
  },

  setEvents: (events) => set({ events }),

  addNote: (note) => set((state) => ({
    notes: [
      ...state.notes,
      {
        ...note,
        id: `note-${Date.now()}`,
        createdAt: new Date().toISOString(),
      },
    ],
  })),

  updateNote: (id, content) => set((state) => ({
    notes: state.notes.map((note) =>
      note.id === id ? { ...note, content, updatedAt: new Date().toISOString() } : note
    ),
  })),

  deleteNote: (id) => set((state) => ({
    notes: state.notes.filter((note) => note.id !== id),
  })),

  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
  })),

  clearFilters: () => set({
    filters: {
      types: [],
      severity: [],
      search: '',
      dateRange: { start: null, end: null },
    },
  }),
}));

// Mock telemetry events for demonstration
export const mockTelemetryEvents: TelemetryEvent[] = [
  { id: '1', timestamp: '2024-01-16T14:30:00Z', type: 'process', source: 'sandbox', details: { processName: 'powershell.exe', commandLine: 'encoded command', pid: 1234 }, suspiciousScore: 85 },
  { id: '2', timestamp: '2024-01-16T14:31:00Z', type: 'file', source: 'sandbox', details: { action: 'create', path: 'C:\\temp\\malware.exe', size: 153600 }, suspiciousScore: 92 },
  { id: '3', timestamp: '2024-01-16T14:31:30Z', type: 'registry', source: 'sandbox', details: { action: 'write', key: 'HKCU\\Software\\Microsoft\\Windows\\Run', value: 'malware.exe' }, suspiciousScore: 88 },
  { id: '4', timestamp: '2024-01-16T14:32:00Z', type: 'network', source: 'sandbox', details: { action: 'connect', destination: '192.168.1.100', port: 4444, protocol: 'tcp' }, suspiciousScore: 95 },
  { id: '5', timestamp: '2024-01-16T14:33:00Z', type: 'module', source: 'sandbox', details: { action: 'load', module: 'kernel32.dll', loadedBy: 'malware.exe' }, suspiciousScore: 45 },
  { id: '6', timestamp: '2024-01-16T14:34:00Z', type: 'behavior', source: 'sandbox', details: { behavior: 'persistence_established', target: 'registry_run_key' }, suspiciousScore: 78 },
  { id: '7', timestamp: '2024-01-16T14:35:00Z', type: 'anomaly', source: 'ai', details: { anomalyType: 'suspicious_process_pattern', description: 'PowerShell encoded command execution detected' }, suspiciousScore: 90 },
  { id: '8', timestamp: '2024-01-16T14:36:00Z', type: 'file', source: 'sandbox', details: { action: 'modify', path: 'C:\\Users\\victim\\Documents\\important.doc', newExtension: '.encrypted' }, suspiciousScore: 98 },
];

export const mockAnalystNotes: AnalystNote[] = [
  { id: 'note-1', investigationId: '1', content: 'Initial analysis shows encoded PowerShell execution with suspicious command patterns. Likely trojan downloader.', type: 'observation', createdAt: '2024-01-16T14:35:00Z', createdBy: 'analyst-1', createdByName: 'John Smith' },
  { id: 'note-2', investigationId: '1', content: 'Confirmed ransomware behavior - file encryption detected with .encrypted extension', type: 'finding', createdAt: '2024-01-16T14:40:00Z', createdBy: 'analyst-1', createdByName: 'John Smith' },
  { id: 'note-3', investigationId: '1', content: 'Network connection to suspicious IP on port 4444 - possible C2 communication', type: 'escalation', createdAt: '2024-01-16T14:45:00Z', createdBy: 'analyst-2', createdByName: 'Sarah Johnson' },
];