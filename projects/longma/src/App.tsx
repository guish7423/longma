import { useState, useEffect } from 'react';
import { ThemeProvider } from './design-system/theme';
import { useSessionStore } from './stores/session';
import ConversationList from './components/Chat/ConversationList';

const SPLASH_STAGES = [
  { text: 'Initializing engine...', delay: 0 },
  { text: 'Loading memories...', delay: 800 },
  { text: 'Connecting to DeepSeek...', delay: 1600 },
  { text: 'Ready', delay: 2400 },
];

function AppContent() {
  const { phase, setPhase, loadConfig } = useSessionStore();
  const [splashStage, setSplashStage] = useState(0);
  const [splashComplete, setSplashComplete] = useState(false);

  useEffect(() => {
    SPLASH_STAGES.forEach((stage, i) => {
      setTimeout(() => {
        setSplashStage(i);
        if (i === SPLASH_STAGES.length - 1) {
          setTimeout(() => setSplashComplete(true), 400);
        }
      }, stage.delay);
    });
  }, []);

  useEffect(() => {
    if (!splashComplete) return;
    loadConfig().then(() => {
      const state = useSessionStore.getState();
      if (state.hasApiKey) {
        setPhase('main');
      } else {
        setPhase('onboarding');
      }
    });
  }, [splashComplete]);

  if (phase === 'splash') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg-primary)',
          gap: 32,
        }}
      >
        {/* Logo */}
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

        {/* Stage indicator — quality check progression */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 240 }}>
          {SPLASH_STAGES.map((stage, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                opacity: splashStage > i ? 0.5 : splashStage === i ? 1 : 0.2,
                transition: 'all 0.3s ease',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: splashStage > i ? '#3fb950' : splashStage === i ? 'var(--accent-primary)' : '#30363d',
                  boxShadow: splashStage === i ? '0 0 8px rgba(79, 111, 255, 0.5)' : 'none',
                  animation: splashStage === i ? 'pulse 1s ease-in-out infinite' : 'none',
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  color: splashStage > i ? '#8b949e' : splashStage === i ? '#e6edf3' : '#484f58',
                  fontWeight: splashStage === i ? 600 : 400,
                }}
              >
                {stage.text}
              </span>
            </div>
          ))}
        </div>

        <style>{`
          @keyframes splashScale {
            0% { transform: scale(0.5); opacity: 0; }
            60% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes splashFade {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  if (phase === 'onboarding') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg-primary)',
          padding: 24,
          gap: 16,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e6edf3' }}>
          Welcome to LongMa
        </h1>
        <p style={{ fontSize: 14, color: '#8b949e', textAlign: 'center', maxWidth: 400 }}>
          LongMa is a desktop AI agent powered by DeepSeek.
          To get started, enter your DeepSeek API key.
        </p>
        <OnboardingForm />
      </div>
    );
  }

  return <MainApp />;
}

function OnboardingForm() {
  const { saveApiKey } = useSessionStore();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const key = (form.elements.namedItem('apiKey') as HTMLInputElement).value.trim();
    if (key) {
      await saveApiKey(key);
      useSessionStore.getState().setPhase('main');
    }
  };

  return (
    <form onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 400 }}
    >
      <input
        name="apiKey"
        type="password"
        placeholder="sk-..."
        style={{
          padding: '12px 16px', fontSize: 14, fontFamily: 'monospace',
          color: '#e6edf3', background: '#161b22', border: '1px solid #30363d',
          borderRadius: 8, outline: 'none',
        }}
      />
      <button type="submit"
        style={{
          padding: '12px 24px', fontSize: 14, fontWeight: 600, color: '#fff',
          background: '#4f6fff', border: 'none', borderRadius: 8, cursor: 'pointer',
        }}
      >
        Get Started
      </button>
    </form>
  );
}

function MainApp() {
  return <ConversationList />;
}

export default function App() {
  return (
    <ThemeProvider>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body, #root {
          height: 100%; width: 100%; overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
          background: #0d1117; color: #e6edf3;
          -webkit-font-smoothing: antialiased;
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
      <AppContent />
    </ThemeProvider>
  );
}
