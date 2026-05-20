import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginCredentials, UserRole } from '../types';
import { RolePermissions as BackendRolePermissions } from '../types';
import api from '../services/api';

// Permission type
type Permission = string;

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  permissions: Permission[];
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      permissions: [],

      // Helper to get permissions based on user role
      getPermissionsForRole: (role: UserRole): Permission[] => {
        const permissions = BackendRolePermissions[role] || [];
        return [...permissions];
      },

      login: async (credentials: LoginCredentials): Promise<{ user: User } | null> => {
        set({ isLoading: true, error: null });

        try {
          const response = await api.login(credentials);
          if (response.success && response.data) {
            const user = response.data.user;
            const permissions = BackendRolePermissions[user.role as UserRole] || [];
            set({
              user: user,
              token: response.data.tokens.accessToken,
              isAuthenticated: true,
              isLoading: false,
              permissions: permissions,
            });
            return { user: user };
          }
          set({ isLoading: false, error: response.message || 'Login failed' });
          return null;
        } catch (error) {
          set({ isLoading: false, error: 'Login failed. Please check your credentials.' });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.logout();
        } catch {
          // Ignore logout errors
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

        if (!token) {
          set({ isAuthenticated: false, permissions: [] });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await api.getCurrentUser();
          if (response.success && response.data) {
            const user = response.data.user;
            const permissions = BackendRolePermissions[user.role as UserRole] || [];
            set({
              user: user,
              isAuthenticated: true,
              isLoading: false,
              permissions: permissions,
            });
          } else {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              permissions: [],
            });
          }
        } catch {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            permissions: [],
          });
        }
      },

      clearError: () => set({ error: null }),

      hasPermission: (permission: string): boolean => {
        const { user, permissions } = get();
        // Admin has all permissions
        if (user?.role === 'admin' || user?.role === 'super_admin') {
          return true;
        }
        return permissions.includes(permission);
      },

      hasRole: (role: UserRole | UserRole[]): boolean => {
        const { user } = get();
        if (!user) return false;
        if (Array.isArray(role)) {
          return role.includes(user.role as UserRole);
        }
        return user.role === role;
      },

      isAdmin: (): boolean => {
        const { user } = get();
        return user?.role === 'admin' || user?.role === 'super_admin';
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user, permissions: state.permissions }),
    }
  )
);
