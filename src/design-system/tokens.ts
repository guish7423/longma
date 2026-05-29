export const tokens = {
  colors: {
    bg: {
      primary: '#0d1117',
      secondary: '#161b22',
      tertiary: '#21262d',
      elevated: '#1c2333',
      hover: '#1c2128',
    },
    text: {
      primary: '#e6edf3',
      secondary: '#8b949e',
      muted: '#6e7681',
      inverse: '#0d1117',
    },
    accent: {
      default: '#4f6fff',
      hover: '#6382ff',
      muted: 'rgba(79, 111, 255, 0.15)',
      subtle: 'rgba(79, 111, 255, 0.08)',
    },
    semantic: {
      success: '#3fb950',
      warning: '#d29922',
      error: '#f85149',
      info: '#58a6ff',
    },
    border: {
      default: '#30363d',
      muted: '#21262d',
      accent: 'rgba(79, 111, 255, 0.3)',
    },
  },
  radius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    '3xl': 48,
  },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif',
    fontMono: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
    sizes: {
      xs: '12px',
      sm: '13px',
      md: '14px',
      lg: '16px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '32px',
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.7,
    },
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.3)',
    md: '0 4px 12px rgba(0,0,0,0.4)',
    lg: '0 8px 24px rgba(0,0,0,0.5)',
    glow: '0 0 20px rgba(79, 111, 255, 0.15)',
  },
  transitions: {
    fast: '150ms ease',
    normal: '250ms ease',
    slow: '400ms ease',
    spring: '500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  animation: {
    duration: {
      fast: 150,
      normal: 250,
      slow: 400,
    },
    easing: {
      default: 'ease',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
} as const;

export type Token = typeof tokens;
