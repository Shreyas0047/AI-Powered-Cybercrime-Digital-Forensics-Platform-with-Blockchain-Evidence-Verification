/**
 * Real-Time Store
 * Zustand store for managing live telemetry, alerts, and dashboard updates
 */

import { create } from 'zustand';
import { socketService, SocketEvent, type TelemetryEvent, type AlertNotification, type SandboxSessionUpdate, type DashboardStatsUpdate } from '../services/socket';

interface RealtimeState {
  // Connection status
  isConnected: boolean;
  socketId: string | null;

  // Live data
  latestTelemetry: TelemetryEvent[];
  liveAlerts: AlertNotification[];
  sandboxSessions: SandboxSessionUpdate[];
  dashboardStats: DashboardStatsUpdate | null;

  // Telemetry buffer (last 50 events)
  telemetryBuffer: TelemetryEvent[];

  // Actions
  connect: () => void;
  disconnect: () => void;
  addTelemetryEvent: (event: TelemetryEvent) => void;
  addLiveAlert: (alert: AlertNotification) => void;
  updateSandboxSession: (session: SandboxSessionUpdate) => void;
  updateDashboardStats: (stats: DashboardStatsUpdate) => void;
  clearTelemetryBuffer: () => void;
}

const MAX_TELEMETRY_BUFFER = 50;
const MAX_LIVE_ALERTS = 20;

let unsubscribers: (() => void)[] | null = null;

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  isConnected: false,
  socketId: null,
  latestTelemetry: [],
  liveAlerts: [],
  sandboxSessions: [],
  dashboardStats: null,
  telemetryBuffer: [],

  connect: () => {
    if (unsubscribers) {
      unsubscribers.forEach(fn => fn());
      unsubscribers = null;
    }

    // Clean up any existing listeners before re-registering
    socketService.disconnect();

    const subs: (() => void)[] = [];

    subs.push(
      socketService.on(SocketEvent.CONNECT, () => {
        set({
          isConnected: true,
          socketId: socketService.getSocketId() || null,
        });
      })
    );

    subs.push(
      socketService.on(SocketEvent.DISCONNECT, () => {
        set({
          isConnected: false,
          socketId: null,
        });
      })
    );

    subs.push(
      socketService.on<AlertNotification>(SocketEvent.ALERT_NEW, (alert) => {
        get().addLiveAlert(alert);
      })
    );

    subs.push(
      socketService.on<DashboardStatsUpdate>(SocketEvent.DASHBOARD_STATS_UPDATE, (stats) => {
        get().updateDashboardStats(stats);
      })
    );

    subs.push(
      socketService.on<SandboxSessionUpdate>(SocketEvent.SANDBOX_SESSION_UPDATE, (session) => {
        get().updateSandboxSession(session);
      })
    );

    // Store cleanup function
    unsubscribers = subs;

    // Connect to socket
    socketService.connect();
  },

  disconnect: () => {
    // Clean up registered listeners first
    if (unsubscribers) {
      unsubscribers.forEach(fn => fn());
      unsubscribers = null;
    }

    socketService.disconnect();
    set({
      isConnected: false,
      socketId: null,
    });
  },

  addTelemetryEvent: (event: TelemetryEvent) => {
    set((state) => ({
      latestTelemetry: [event, ...state.latestTelemetry].slice(0, MAX_TELEMETRY_BUFFER),
      telemetryBuffer: [event, ...state.telemetryBuffer].slice(0, MAX_TELEMETRY_BUFFER),
    }));
  },

  addLiveAlert: (alert: AlertNotification) => {
    set((state) => ({
      liveAlerts: [alert, ...state.liveAlerts].slice(0, MAX_LIVE_ALERTS),
    }));
  },

  updateSandboxSession: (session: SandboxSessionUpdate) => {
    set((state) => {
      const existingIndex = state.sandboxSessions.findIndex((s) => s.id === session.id);
      if (existingIndex >= 0) {
        const updated = [...state.sandboxSessions];
        updated[existingIndex] = session;
        return { sandboxSessions: updated };
      }
      return { sandboxSessions: [session, ...state.sandboxSessions].slice(0, 50) };
    });
  },

  updateDashboardStats: (stats: DashboardStatsUpdate) => {
    set({ dashboardStats: stats });
  },

  clearTelemetryBuffer: () => {
    set({ telemetryBuffer: [], latestTelemetry: [] });
  },
}));

// Initialize socket connection on store creation
// This will be triggered when the app mounts
export function initializeRealtimeConnection() {
  const store = useRealtimeStore.getState();
  if (!store.isConnected) {
    store.connect();
  }
  return () => store.disconnect();
}

export default useRealtimeStore;