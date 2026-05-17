/**
 * Theme Store
 * Dark/Light mode management with enterprise polish
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// Get system preference
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

// Apply theme to document
function applyTheme(theme: 'light' | 'dark') {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      actualTheme: getSystemTheme(),

      setTheme: (theme: Theme) => {
        const actualTheme = theme === 'system' ? getSystemTheme() : theme;
        applyTheme(actualTheme);
        set({ theme, actualTheme });
      },

      toggleTheme: () => {
        const { theme } = get();
        const newTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
        const newActualTheme = newTheme === 'system' ? getSystemTheme() : newTheme as 'light' | 'dark';
        applyTheme(newActualTheme);
        set({ theme: newTheme, actualTheme: newActualTheme });
      },
    }),
    {
      name: 'forensics-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const actualTheme = state.theme === 'system' ? getSystemTheme() : state.theme;
          applyTheme(actualTheme);
          state.actualTheme = actualTheme;
        }
      },
    }
  )
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const state = useThemeStore.getState();
    if (state.theme === 'system') {
      const newTheme = e.matches ? 'dark' : 'light';
      applyTheme(newTheme);
      useThemeStore.setState({ actualTheme: newTheme });
    }
  });
}
