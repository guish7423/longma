import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
}

const styles: Record<string, React.CSSProperties> = {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'inherit',
    fontWeight: 500,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 150ms ease',
    whiteSpace: 'nowrap',
  },
  primary: {
    background: '#4f6fff',
    color: '#fff',
  },
  secondary: {
    background: '#21262d',
    color: '#e6edf3',
    border: '1px solid #30363d',
  },
  ghost: {
    background: 'transparent',
    color: '#8b949e',
  },
  danger: {
    background: 'rgba(248, 81, 73, 0.12)',
    color: '#f85149',
  },
  sm: { padding: '4px 12px', fontSize: 12, height: 28 },
  md: { padding: '8px 16px', fontSize: 14, height: 36 },
  lg: { padding: '12px 24px', fontSize: 16, height: 44 },
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  children,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const hoverStyle: Record<string, React.CSSProperties> = {
    primary: { background: '#6382ff' },
    secondary: { background: '#30363d' },
    ghost: { color: '#e6edf3', background: 'rgba(255,255,255,0.06)' },
    danger: { background: 'rgba(248, 81, 73, 0.2)' },
  };

  return (
    <button
      style={{
        ...styles.base,
        ...styles[variant],
        ...styles[size],
        opacity: disabled || loading ? 0.6 : 1,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, hoverStyle[variant]);
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          const base = styles[variant] as Record<string, string>;
          Object.entries(base).forEach(([key, val]) => {
            (e.currentTarget.style as any)[key] = val;
          });
        }
      }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="spinner" /> : icon}
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  ...props
}: Omit<ButtonProps, 'children'> & { label: string; icon: ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 8,
        border: 'none',
        background: 'transparent',
        color: '#8b949e',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
        e.currentTarget.style.color = '#e6edf3';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = '#8b949e';
      }}
      {...props}
    >
      {icon}
    </button>
  );
}
