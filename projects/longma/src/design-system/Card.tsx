import type { ReactNode, CSSProperties } from 'react';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'accent';
  padding?: 'sm' | 'md' | 'lg';
  style?: CSSProperties;
  onClick?: () => void;
}

const variantStyles: Record<string, CSSProperties> = {
  default: {
    background: '#161b22',
    border: '1px solid #30363d',
  },
  elevated: {
    background: '#1c2333',
    border: '1px solid #30363d',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
  },
  accent: {
    background: 'rgba(79, 111, 255, 0.06)',
    border: '1px solid rgba(79, 111, 255, 0.2)',
  },
};

const paddingStyles: Record<string, CSSProperties> = {
  sm: { padding: 12 },
  md: { padding: 16 },
  lg: { padding: 24 },
};

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  style,
  onClick,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 12,
        ...variantStyles[variant],
        ...paddingStyles[padding],
        cursor: onClick ? 'pointer' : undefined,
        transition: 'all 150ms ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = 'rgba(79,111,255,0.3)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = (variantStyles[variant].border as string) || '#30363d';
        }
      }}
    >
      {children}
    </div>
  );
}
