import { useEffect } from 'react';
import { ThemeProvider } from './design-system/theme';
import { useSessionStore } from './stores/session';
import SplashScreen from './components/Onboarding/SplashScreen';
import OnboardingWizard from './components/Onboarding/OnboardingWizard';
import ConversationList from './components/Chat/ConversationList';

function AppContent() {
  const { phase, setPhase, loadConfig } = useSessionStore();

  useEffect(() => {
    if (phase === 'main') return;
  }, [phase, loadConfig]);

  const handleSplashComplete = () => {
    loadConfig().then(() => {
      const state = useSessionStore.getState();
      if (state.hasApiKey) {
        setPhase('main');
      } else {
        setPhase('onboarding');
      }
    });
  };

  if (phase === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (phase === 'onboarding') {
    return <OnboardingWizard />;
  }

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
      `}</style>
      <AppContent />
    </ThemeProvider>
  );
}
