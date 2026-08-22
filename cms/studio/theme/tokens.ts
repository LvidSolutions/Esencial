export const esencialVisualTokens = {
  color: {
    ink: '#1f1f1d',
    muted: '#5b5b55',
    paper: '#ffffff',
    canvas: '#fbfbfa',
    wash: '#f5f5f1',
    border: '#d1d1ca',
    borderStrong: '#8a8a82',
    focus: '#005fcc',
    focusSoft: '#dbeaff',
    draftInk: '#5e4700',
    draftSurface: '#fff6cc',
    draftBorder: '#8a6b00',
    criticalInk: '#8c2f1c',
    criticalSurface: '#fff1ed',
  },
  typography: {
    sans: 'Roboto, Arial, Helvetica, sans-serif',
    measure: '68ch',
    labelTracking: '0.1em',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    section: 72,
  },
  radius: {
    small: 2,
    medium: 4,
    large: 8,
  },
  motion: {
    duration: '160ms',
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
  },
} as const

export type EsencialVisualTokens = typeof esencialVisualTokens
