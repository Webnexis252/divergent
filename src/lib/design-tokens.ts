// COLOR TOKENS - EXACTLY MATCHING EXISTING COLORS
export const colors = {
  primary: {
    blue: '#38c1ff',
    darkBlue: '#1b77ff',
    lightBlue: '#72d3ff',
  },
  accent: {
    gold: '#fec600',
    yellow: '#ffc107',
  },
  status: {
    success: '#4caf50',
    warning: '#f59e0b',
    error: '#ff3d00',
    mentor: '#925fe2',
  },
  neutral: {
    black: '#000000',
    gray900: '#111827',
    gray800: '#1f2937',
    gray700: '#374151',
    gray600: '#4b5563',
    gray500: '#6b7280',
    gray400: '#9ca3af',
    gray300: '#d1d5db',
    gray200: '#e5e7eb',
    gray100: '#f3f4f6',
    white: '#ffffff',
  },
  background: {
    page: '#f7f6f6',
    sidebar: '#ffc107',
    card: '#ffffff',
  }
};

// TYPOGRAPHY SCALE - BASED ON EXISTING SIZES BUT SYSTEMATIZED
export const typography = {
  display: {
    '3xl': { fontSize: '3.5rem', lineHeight: '1.1', fontWeight: '700' },
    '2xl': { fontSize: '2.75rem', lineHeight: '1.15', fontWeight: '700' },
    xl: { fontSize: '2.25rem', lineHeight: '1.2', fontWeight: '600' },
    lg: { fontSize: '1.875rem', lineHeight: '1.25', fontWeight: '600' },
    md: { fontSize: '1.5rem', lineHeight: '1.3', fontWeight: '600' },
  },
  body: {
    xl: { fontSize: '1.25rem', lineHeight: '1.5', fontWeight: '400' },
    lg: { fontSize: '1.125rem', lineHeight: '1.6', fontWeight: '400' },
    md: { fontSize: '1rem', lineHeight: '1.6', fontWeight: '400' },
    sm: { fontSize: '0.875rem', lineHeight: '1.6', fontWeight: '400' },
    xs: { fontSize: '0.75rem', lineHeight: '1.6', fontWeight: '400' },
  },
  caption: {
    md: { fontSize: '0.6875rem', lineHeight: '1.4', fontWeight: '500' },
  }
};

// SPACING SCALE - 4px BASE UNIT
export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '0.75rem',   // 12px
  base: '1rem',    // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
  '4xl': '5rem',   // 80px
};

// BORDER RADIUS SYSTEM
export const borderRadius = {
  sm: '0.5rem',    // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.5rem',    // 24px
  '2xl': '2rem',   // 32px
  full: '9999px',
};

// ANIMATION CONSTANTS
export const animations = {
  durations: {
    fast: 0.15,
    base: 0.25,
    slow: 0.4,
    deliberate: 0.6,
  },
  easings: {
    easeOut: [0.25, 0.46, 0.45, 0.94],
    easeInOut: [0.4, 0, 0.2, 1],
    spring: { type: "spring", stiffness: 300, damping: 25 },
  },
};
