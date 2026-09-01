export const esencialVisualTokens = {
  color: {
    // The workspace is deliberately monochrome: one dark canvas, light text,
    // and restrained charcoal surfaces. Every normal text pair exceeds AA.
    ink: '#ffffff',
    muted: '#c9c9c9',
    paper: '#121212',
    canvas: '#000000',
    wash: '#1b1b1b',
    border: '#474747',
    borderStrong: '#777777',
    focus: '#ffd54a',
    focusSoft: '#4a3b00',
    draftInk: '#fff1a8',
    draftSurface: '#2d2608',
    draftBorder: '#d8bb32',
    criticalInk: '#ffc1b8',
    criticalSurface: '#3a1510',
  },
  typography: {
    sans: '"Roboto", Arial, Helvetica, sans-serif',
    measure: '68ch',
    headingTracking: '-0.025em',
    labelTracking: '0.1em',
    contentLineHeight: '1.55',
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
