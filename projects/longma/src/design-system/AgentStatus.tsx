import { useEffect, useState } from 'react';

export type AgentState = 'idle' | 'thinking' | 'speaking' | 'error';

interface AgentStatusProps {
  state: AgentState;
  label?: string;
}

const stateConfig: Record<AgentState, { color: string; label: string }> = {
  idle: { color: '#8b949e', label: 'Idle' },
  thinking: { color: '#4f6fff', label: 'Thinking' },
  speaking: { color: '#3fb950', label: 'Speaking' },
  error: { color: '#f85149', label: 'Error' },
};

function ThinkingDots() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, []);
  return <>{dots}</>;
}

export function AgentStatus({ state, label }: AgentStatusProps) {
  const config = stateConfig[state];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 12px',
        borderRadius: 20,
        background: 'rgba(255,255,255,0.04)',
        fontSize: 12,
        color: config.color,
      }}
    >
      {/* Status dot */}
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: config.color,
          opacity: state === 'idle' ? 0.5 : 1,
          animation:
            state === 'thinking'
              ? 'pulse 1.5s ease-in-out infinite'
              : undefined,
        }}
      />

      {/* Label */}
      <span style={{ fontWeight: 500 }}>
        {label || config.label}
        {state === 'thinking' && <ThinkingDots />}
      </span>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

interface ProgressBarProps {
  value: number; // 0-100
  color?: string;
  height?: number;
}

export function ProgressBar({
  value,
  color = '#4f6fff',
  height = 4,
}: ProgressBarProps) {
  return (
    <div
      style={{
        width: '100%',
        height,
        background: '#21262d',
        borderRadius: height / 2,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          height: '100%',
          background: color,
          borderRadius: height / 2,
          transition: 'width 300ms ease',
        }}
      />
    </div>
  );
}
