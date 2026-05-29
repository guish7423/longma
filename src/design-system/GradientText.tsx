import { type ReactNode } from 'react';

interface GradientTextProps {
  children: ReactNode;
  gradient?: string;
  size?: string;
  weight?: number;
  style?: Record<string, any>;
}

const gradients = {
  primary: 'linear-gradient(135deg, #4f6fff 0%, #7c3aed 100%)',
  accent: 'linear-gradient(135deg, #58a6ff 0%, #a78bfa 100%)',
  warm: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  success: 'linear-gradient(135deg, #3fb950 0%, #58a6ff 100%)',
  cool: 'linear-gradient(135deg, #06b6d4 0%, #4f6fff 100%)',
};

export default function GradientText({
  children,
  gradient = 'primary',
  size,
  weight,
  style,
}: GradientTextProps) {
  const g = gradients[gradient as keyof typeof gradients] || gradient;

  return (
    <span
      style={{
        background: g,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontSize: size,
        fontWeight: weight,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
