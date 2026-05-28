import { useEffect, useState } from 'react';

const SPLASH_STAGES = [
  { text: 'Initializing engine...', delay: 0 },
  { text: 'Loading memories...', delay: 800 },
  { text: 'Connecting to DeepSeek...', delay: 1600 },
  { text: 'Ready', delay: 2400 },
];

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number; // total ms before auto-transition
}

export default function SplashScreen({ onComplete, duration = 3200 }: SplashScreenProps) {
  const [stage, setStage] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    SPLASH_STAGES.forEach((s, i) => {
      setTimeout(() => setStage(i), s.delay);
    });

    const fadeTimer = setTimeout(() => setFadeOut(true), duration - 400);
    const completeTimer = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, duration]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0d1117',
        gap: 32,
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.4s ease-out',
        zIndex: 9999,
      }}
    >
      {/* Animated logo */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          background: 'linear-gradient(135deg, #4f6fff 0%, #7c3aed 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
          fontWeight: 700,
          color: '#fff',
          boxShadow: '0 0 60px rgba(79, 111, 255, 0.3)',
          animation: 'splashScale 2s ease-out forwards',
        }}
      >
        LM
      </div>

      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: '#e6edf3',
          letterSpacing: '-0.5px',
          animation: 'splashFade 1.5s ease-out 0.5s both',
        }}
      >
        LongMa
      </h1>

      {/* Stage progression */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 240 }}>
        {SPLASH_STAGES.map((s, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              opacity: stage > i ? 0.5 : stage === i ? 1 : 0.2,
              transition: 'all 0.3s ease',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: stage > i ? '#3fb950' : stage === i ? '#4f6fff' : '#30363d',
                boxShadow: stage === i ? '0 0 8px rgba(79, 111, 255, 0.5)' : 'none',
                animation: stage === i ? 'pulse 1s ease-in-out infinite' : 'none',
              }}
            />
            <span
              style={{
                fontSize: 13,
                color: stage > i ? '#8b949e' : stage === i ? '#e6edf3' : '#484f58',
                fontWeight: stage === i ? 600 : 400,
              }}
            >
              {s.text}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes splashScale {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes splashFade {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
