import { type ReactNode } from 'react';

interface GlassPanelProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'accent';
  blur?: number;
  padding?: number;
  style?: Record<string, any>;
  onClick?: () => void;
}

export default function GlassPanel({
  children,
  variant = 'default',
  blur = 12,
  padding = 16,
  style,
  onClick,
}: GlassPanelProps) {
  const bgMap = {
    default: 'rgba(22, 27, 34, 0.6)',
    elevated: 'rgba(28, 35, 51, 0.7)',
    accent: 'rgba(79, 111, 255, 0.08)',
  };

  const borderMap = {
    default: 'rgba(48, 54, 61, 0.4)',
    elevated: 'rgba(79, 111, 255, 0.15)',
    accent: 'rgba(79, 111, 255, 0.25)',
  };

  return (
    <div
      onClick={onClick}
      style={{
        background: bgMap[variant],
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        border: `1px solid ${borderMap[variant]}`,
        borderRadius: 12,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
