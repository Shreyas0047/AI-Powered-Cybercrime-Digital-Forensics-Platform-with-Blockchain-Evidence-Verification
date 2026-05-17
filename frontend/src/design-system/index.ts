/**
 * Enterprise Design System
 * Centralized design tokens, styles, and utilities for the ForensicsAI platform
 */

import { clsx, type ClassValue } from 'clsx';

// ============================================
// Design Tokens - Spacing System
// ============================================
export const spacing = {
  // Core spacing scale (based on 4px grid)
  '0': '0px',
  '0.5': '2px',
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '8': '32px',
  '10': '40px',
  '12': '48px',
  '16': '64px',
  '20': '80px',
  '24': '96px',

  // Semantic spacing
  'page-padding': '24px',
  'section-gap': '24px',
  'card-gap': '16px',
  'element-gap': '12px',
  'compact-gap': '8px',
  'tight-gap': '4px',
} as const;

// ============================================
// Design Tokens - Typography Scale
// ============================================
export const typography = {
  // Font families
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  },

  // Font sizes
  fontSize: {
    '2xs': '10px',
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
  },

  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Line heights
  lineHeight: {
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
  },
} as const;

// ============================================
// Design Tokens - Color System
// ============================================
export const colors = {
  // Primary - Cyan
  primary: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
  },

  // Secondary - Violet
  secondary: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },

  // Severity Colors
  severity: {
    critical: {
      bg: 'bg-red-50 dark:bg-red-950/30',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800/50',
      solid: 'bg-red-500',
    },
    high: {
      bg: 'bg-orange-50 dark:bg-orange-950/30',
      text: 'text-orange-700 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800/50',
      solid: 'bg-orange-500',
    },
    medium: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800/50',
      solid: 'bg-amber-500',
    },
    low: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/50',
      solid: 'bg-emerald-500',
    },
    info: {
      bg: 'bg-sky-50 dark:bg-sky-950/30',
      text: 'text-sky-700 dark:text-sky-400',
      border: 'border-sky-200 dark:border-sky-800/50',
      solid: 'bg-sky-500',
    },
  },

  // Status Colors
  status: {
    active: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      dot: 'bg-emerald-500',
    },
    pending: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      text: 'text-amber-700 dark:text-amber-400',
      dot: 'bg-amber-500',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-950/30',
      text: 'text-red-700 dark:text-red-400',
      dot: 'bg-red-500',
    },
    inactive: {
      bg: 'bg-slate-50 dark:bg-slate-800/50',
      text: 'text-slate-600 dark:text-slate-400',
      dot: 'bg-slate-400',
    },
  },

  // Background Scale
  background: {
    primary: 'bg-white dark:bg-slate-900',
    secondary: 'bg-slate-50 dark:bg-slate-800/50',
    tertiary: 'bg-slate-100 dark:bg-slate-800',
    card: 'bg-white dark:bg-slate-800/80',
    elevated: 'bg-white dark:bg-slate-800',
    overlay: 'bg-slate-900/50 dark:bg-slate-900/80',
  },

  // Border Scale
  border: {
    primary: 'border-slate-200 dark:border-slate-700',
    secondary: 'border-slate-300 dark:border-slate-600',
    accent: 'border-cyan-500 dark:border-cyan-400',
  },

  // Text Scale
  text: {
    primary: 'text-slate-900 dark:text-slate-100',
    secondary: 'text-slate-600 dark:text-slate-400',
    tertiary: 'text-slate-500 dark:text-slate-500',
    muted: 'text-slate-400 dark:text-slate-600',
    inverse: 'text-white dark:text-slate-900',
  },
} as const;

// ============================================
// Design Tokens - Shadows
// ============================================
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',

  // Enterprise shadows
  card: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
  elevated: '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
  dropdown: '0 10px 40px -5px rgb(0 0 0 / 0.12), 0 4px 6px -2px rgb(0 0 0 / 0.08)',
  glow: {
    cyan: '0 0 20px rgb(6 182 212 / 0.25)',
    violet: '0 0 20px rgb(168 85 247 / 0.25)',
    red: '0 0 20px rgb(239 68 68 / 0.25)',
  },
} as const;

// ============================================
// Design Tokens - Border Radius
// ============================================
export const radii = {
  none: '0px',
  sm: '4px',
  DEFAULT: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  full: '9999px',
} as const;

// ============================================
// Design Tokens - Transitions
// ============================================
export const transitions = {
  // Duration
  duration: {
    fast: '75ms',
    DEFAULT: '150ms',
    slow: '300ms',
    slower: '500ms',
  },

  // Easing
  easing: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
} as const;

// ============================================
// Z-Index Scale
// ============================================
export const zIndex = {
  dropdown: '1000',
  sticky: '1100',
  fixed: '1200',
  modalBackdrop: '1300',
  modal: '1400',
  popover: '1500',
  tooltip: '1600',
} as const;

// ============================================
// Animation Keyframes
// ============================================
export const animations = {
  fadeIn: {
    keyframe: 'fadeIn',
    duration: '200ms',
    easing: 'ease-out',
  },
  fadeOut: {
    keyframe: 'fadeOut',
    duration: '150ms',
    easing: 'ease-in',
  },
  slideUp: {
    keyframe: 'slideUp',
    duration: '300ms',
    easing: 'ease-out',
  },
  slideDown: {
    keyframe: 'slideDown',
    duration: '200ms',
    easing: 'ease-out',
  },
  slideInRight: {
    keyframe: 'slideInRight',
    duration: '300ms',
    easing: 'ease-out',
  },
  slideInLeft: {
    keyframe: 'slideInLeft',
    duration: '300ms',
    easing: 'ease-out',
  },
  scaleIn: {
    keyframe: 'scaleIn',
    duration: '200ms',
    easing: 'ease-out',
  },
  pulse: {
    keyframe: 'pulse',
    duration: '2s',
    easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
    repeat: 'infinite',
  },
  spin: {
    keyframe: 'spin',
    duration: '1s',
    easing: 'linear',
    repeat: 'infinite',
  },
  shimmer: {
    keyframe: 'shimmer',
    duration: '1.5s',
    easing: 'linear',
    repeat: 'infinite',
  },
} as const;

// ============================================
// Component Variants
// ============================================
export const buttonVariants = {
  // Primary variants
  primary: `
    bg-gradient-to-r from-cyan-500 to-cyan-600
    text-white
    hover:from-cyan-600 hover:to-cyan-700
    shadow-sm hover:shadow-md
    focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2
  `,
  secondary: `
    bg-gradient-to-r from-violet-500 to-violet-600
    text-white
    hover:from-violet-600 hover:to-violet-700
    shadow-sm hover:shadow-md
    focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2
  `,

  // Neutral variants
  solid: `
    bg-slate-100 dark:bg-slate-700
    text-slate-700 dark:text-slate-200
    hover:bg-slate-200 dark:hover:bg-slate-600
    border border-slate-200 dark:border-slate-600
  `,
  outline: `
    bg-transparent
    text-slate-700 dark:text-slate-200
    border border-slate-300 dark:border-slate-600
    hover:bg-slate-50 dark:hover:bg-slate-800
  `,
  ghost: `
    bg-transparent
    text-slate-600 dark:text-slate-300
    hover:bg-slate-100 dark:hover:bg-slate-800
  `,

  // Danger
  danger: `
    bg-red-500
    text-white
    hover:bg-red-600
    shadow-sm hover:shadow-md
    focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2
  `,

  // Success
  success: `
    bg-emerald-500
    text-white
    hover:bg-emerald-600
    shadow-sm hover:shadow-md
    focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2
  `,
} as const;

export const cardVariants = {
  default: `
    bg-white dark:bg-slate-800/80
    border border-slate-200 dark:border-slate-700/50
    shadow-card
  `,
  elevated: `
    bg-white dark:bg-slate-800
    border border-slate-200 dark:border-slate-700
    shadow-elevated
  `,
  bordered: `
    bg-white dark:bg-slate-800/80
    border-2 border-slate-300 dark:border-slate-600
  `,
  ghost: `
    bg-transparent
    border border-transparent
  `,
  accent: `
    bg-white dark:bg-slate-800/80
    border border-cyan-200 dark:border-cyan-700/50
    shadow-card
  `,
} as const;

// ============================================
// Utility Functions
// ============================================

/**
 * Combine class names with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Create a responsive class name
 */
export function responsive(
  base: string,
  sm?: string,
  md?: string,
  lg?: string,
  xl?: string
): string {
  return [base, sm, md, lg, xl].filter(Boolean).join(' ');
}

/**
 * Get CSS variable value
 */
export function cssVar(name: string): string {
  return `var(--${name})`;
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date, format: 'short' | 'long' | 'relative' = 'short'): string {
  const d = new Date(date);

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'long':
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    case 'relative':
      return getRelativeTime(d);
    default:
      return d.toLocaleDateString();
  }
}

/**
 * Get relative time string
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

// ============================================
// Hooks for Design System
// ============================================
export const useDesignSystem = () => ({
  spacing,
  typography,
  colors,
  shadows,
  radii,
  transitions,
  zIndex,
  animations,
  buttonVariants,
  cardVariants,
  cn,
  responsive,
  cssVar,
  formatDate,
});

// ============================================
// Export all design tokens
// ============================================
export const designSystem = {
  spacing,
  typography,
  colors,
  shadows,
  radii,
  transitions,
  zIndex,
  animations,
  buttonVariants,
  cardVariants,
  cn,
  responsive,
  cssVar,
  formatDate,
};

export default designSystem;