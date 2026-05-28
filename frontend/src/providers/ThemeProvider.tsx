/**
 * Theme Provider
 * Enterprise theme management with dark/light mode support
 */

import React, { createContext, useContext, useEffect } from 'react';
import { useThemeStore } from '../stores/themeStore';
import type { Theme } from '../stores/themeStore';

interface ThemeContextValue {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme, toggleTheme } = useThemeStore();
  // Editorial dark mode — warm grays, not cyber blue
  const actualTheme: 'light' | 'dark' = 'dark';
  const isDark = true;

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add('dark');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', '#0d0c0e');
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, actualTheme, setTheme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// CSS variables for enterprise theming
export const themeVariables = {
  light: {
    '--bg-primary': '#ffffff',
    '--bg-secondary': '#f8fafc',
    '--bg-tertiary': '#f1f5f9',
    '--bg-card': '#ffffff',
    '--bg-elevated': '#ffffff',
    '--text-primary': '#0f172a',
    '--text-secondary': '#475569',
    '--text-tertiary': '#94a3b8',
    '--border-primary': '#e2e8f0',
    '--border-secondary': '#cbd5e1',
    '--accent-primary': '#0891b2', // Cyan
    '--accent-secondary': '#7c3aed', // Violet
    '--accent-hover': '#06b6d4',
    '--success': '#059669',
    '--warning': '#d97706',
    '--error': '#dc2626',
    '--info': '#0284c7',
  },
  dark: {
    '--bg-primary': '#0f172a',
    '--bg-secondary': '#1e293b',
    '--bg-tertiary': '#334155',
    '--bg-card': '#1e293b',
    '--bg-elevated': '#334155',
    '--text-primary': '#f8fafc',
    '--text-secondary': '#94a3b8',
    '--text-tertiary': '#64748b',
    '--border-primary': '#334155',
    '--border-secondary': '#475569',
    '--accent-primary': '#22d3ee', // Cyan light
    '--accent-secondary': '#a78bfa', // Violet light
    '--accent-hover': '#67e8f9',
    '--success': '#34d399',
    '--warning': '#fbbf24',
    '--error': '#f87171',
    '--info': '#38bdf8',
  },
};