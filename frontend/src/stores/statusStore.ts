import { create } from 'zustand';
import type { StatusMessage, StatusType } from '../components/ui/StatusBanner';

interface StatusState {
  status: StatusMessage | null;
  show: (type: StatusType, message: string, detail?: string, duration?: number) => void;
  dismiss: () => void;
}

let autoDismissTimer: ReturnType<typeof setTimeout> | null = null;

export const useStatusStore = create<StatusState>((set) => ({
  status: null,

  show: (type, message, detail, duration = 5000) => {
    if (autoDismissTimer) {
      clearTimeout(autoDismissTimer);
      autoDismissTimer = null;
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set({ status: { id, type, message, detail } });

    if (type !== 'loading' && duration > 0) {
      autoDismissTimer = setTimeout(() => {
        set({ status: null });
        autoDismissTimer = null;
      }, duration);
    }
  },

  dismiss: () => {
    if (autoDismissTimer) {
      clearTimeout(autoDismissTimer);
      autoDismissTimer = null;
    }
    set({ status: null });
  },
}));
