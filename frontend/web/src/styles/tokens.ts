/**
 * Yuding V2 — Shared Design System Tokens
 * Source of truth for theme values, colors, typography, breakpoints, and states.
 */

export const colors = {
  primary: '#01796F',
  primaryDark: '#005951',
  secondary: '#02E0D5',
  accent: '#218A87',
  dark: '#001B1A',
  white: '#FFFFFF',

  // Dark mode surface tokens
  surfaceDark: '#0A0E1A',
  surfaceCardDark: '#1A1F2E',
  surfaceCardDarkAlt: '#121c1c',
  surfaceHoverDark: '#252B3D',
  accentGlowDark: '#00D4AA',
  borderDark: 'rgba(0, 212, 170, 0.2)',

  // Semantic feedback colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#29B6F6',

  // Neutrals
  gray: {
    50: '#F8F9FA',
    100: '#F4F6F6',
    200: '#EDF2F7',
    300: '#E2E8F0',
    400: '#CBD5E1',
    500: '#94A3B8',
    600: '#64748B',
    700: '#475569',
    800: '#1E293B',
    900: '#0F172A',
  },
} as const;

export const typography = {
  fontFamily: {
    sans: "'Poppins', 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    display: "'Montserrat', 'Poppins', sans-serif",
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
} as const;

export const spacing = {
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
} as const;

export const borderRadius = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  card: '12px',
  xl: '16px',
  pill: '30px',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.04)',
  base: '0 4px 15px rgba(0, 0, 0, 0.08)',
  card: '0 6px 20px rgba(0, 0, 0, 0.08)',
  strong: '0 10px 30px rgba(0, 0, 0, 0.15)',
  glow: '0 0 20px rgba(2, 224, 213, 0.3)',
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const transitions = {
  default: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  fast: 'all 0.15s ease-in-out',
} as const;

export const states = {
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-[#02E0D5] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1A1F2E]',
  disabled: 'disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none',
  errorInput: 'border-red-500 focus:ring-red-400 text-red-900 dark:text-red-300 dark:border-red-600',
} as const;
