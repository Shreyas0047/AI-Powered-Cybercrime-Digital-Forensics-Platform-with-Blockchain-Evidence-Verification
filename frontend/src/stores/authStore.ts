import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginCredentials } from '../types';
import api from '../services/api';

// Demo users for offline mode
const DEMO_USERS: Record<string, User> = {
  'admin@forensics.ai': {
    id: '1',
    email: 'admin@forensics.ai',
    name: 'Admin User',
    role: 'admin',
    department: 'Security Operations',
    createdAt: new Date().toISOString(),
  },
  'analyst@forensics.ai': {
    id: '2',
    email: 'analyst@forensics.ai',
    name: 'Sarah Johnson',
    role: 'analyst',
    department: 'Threat Investigation',
    createdAt: new Date().toISOString(),
  },
  'demo': {
    id: '3',
    email: 'demo@forensics.ai',
    name: 'Demo User',
    role: 'analyst',
    department: 'Demo Department',
    createdAt: new Date().toISOString(),
  },
};

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials): Promise<{ user: User } | null> => {
        set({ isLoading: true, error: null });

        // Demo mode: allow login with demo credentials even without backend
        const email = credentials.email.toLowerCase();
        if (DEMO_USERS[email] || email === 'demo') {
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 500));

          const demoUser = DEMO_USERS[email] || DEMO_USERS['demo'];
          set({
            user: demoUser,
            token: 'demo-token-' + Date.now(),
            isAuthenticated: true,
            isLoading: false,
          });
          return { user: demoUser };
        }

        // Try backend login
        try {
          const response = await api.login(credentials);
          if (response.success && response.data) {
            set({
              user: response.data.user,
              token: response.data.tokens.accessToken,
              isAuthenticated: true,
              isLoading: false,
            });
            return { user: response.data.user };
          }
          set({ isLoading: false, error: response.message || 'Login failed' });
          return null;
        } catch (error) {
          // Fallback to demo mode if backend unavailable
          set({ isLoading: false, error: 'Server unavailable. Try demo@forensics.ai or admin@forensics.ai' });
          throw error;
        }
      },

      logout: async () => {
        const token = get().token;
        // Only try API logout if it's a real token (not demo)
        if (token && !token.startsWith('demo-')) {
          try {
            await api.logout();
          } catch {
            // Ignore logout errors
          }
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      },

      checkAuth: async () => {
        const token = get().token;

        // Check if it's a demo token
        if (token?.startsWith('demo-')) {
          // Restore demo user from stored user
          const user = get().user;
          if (user) {
            set({ isAuthenticated: true });
          }
          return;
        }

        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await api.getCurrentUser();
          if (response.success && response.data) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
