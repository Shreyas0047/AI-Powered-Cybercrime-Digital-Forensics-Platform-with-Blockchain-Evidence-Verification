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