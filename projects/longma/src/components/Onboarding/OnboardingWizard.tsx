import { useState } from 'react';
import { useSessionStore } from '../../stores/session';

const STEPS = ['Welcome', 'API Key', 'Model', 'Ready'];

export default function OnboardingWizard() {
  const { saveApiKey, switchModel } = useSessionStore();
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('deepseek-v4-flash');

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleComplete = async () => {
    if (apiKey.trim()) {
      await saveApiKey(apiKey.trim());
    }
    await switchModel(selectedModel);
    useSessionStore.getState().setPhase('main');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0d1117',
        padding: 24,
      }}
    >
      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {STEPS.map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                background: i <= step ? '#4f6fff' : '#21262d',
                color: i <= step ? '#fff' : '#484f58',
                transition: 'all 0.3s ease',
              }}
            >
              {i + 1}
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: i === step ? 600 : 400,
                color: i === step ? '#e6edf3' : '#484f58',
              }}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  width: 24,
                  height: 1,
                  background: i < step ? '#4f6fff' : '#21262d',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: 12,
          padding: 32,
          animation: 'fadeIn 0.3s ease-out',
        }}
      >
        {step === 0 && (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                background: 'linear-gradient(135deg, #4f6fff 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 700,
                color: '#fff',
                margin: '0 auto 20px',
              }}
            >
              LM
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e6edf3', marginBottom: 8 }}>
              Welcome to LongMa
            </h1>
            <p style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.6 }}>
              Your desktop AI agent, powered by DeepSeek. LongMa remembers your context,
              optimizes for cache efficiency, and helps you get more done with lower costs.
            </p>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>
              API Key
            </h2>
            <p style={{ fontSize: 12, color: '#8b949e', marginBottom: 16 }}>
              Enter your DeepSeek API key. It's stored locally at <code style={{ fontSize: 11, background: '#0d1117', padding: '1px 4px', borderRadius: 3 }}>~/.longma/config.json</code> and never shared.
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 14,
                fontFamily: 'monospace',
                color: '#e6edf3',
                background: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: 8,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ fontSize: 11, color: '#484f58', marginTop: 8 }}>
              Get your API key from the DeepSeek platform. You can change this later in Settings.
            </p>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>
              Model Preference
            </h2>
            <p style={{ fontSize: 12, color: '#8b949e', marginBottom: 16 }}>
              Choose your default model. You can switch anytime from the bottom bar.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { id: 'deepseek-v4-flash', name: 'DeepSeek Flash', desc: 'Faster, cheaper', price: '$0.07/M input', tag: 'Default' },
                { id: 'deepseek-v4-pro', name: 'DeepSeek Pro', desc: 'More capable', price: '$0.42/M input', tag: 'Premium' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  style={{
                    flex: 1,
                    padding: 16,
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: 10,
                    background: selectedModel === m.id ? 'rgba(79, 111, 255, 0.08)' : '#0d1117',
                    border: selectedModel === m.id ? '1px solid rgba(79, 111, 255, 0.4)' : '1px solid #30363d',
                    transition: 'all 0.15s ease',
                    color: '#e6edf3',
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 2 }}>{m.desc}</div>
                  <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 8 }}>{m.price}</div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      fontSize: 10,
                      fontWeight: 600,
                      borderRadius: 4,
                      color: '#fff',
                      background: '#4f6fff',
                    }}
                  >
                    {m.tag}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                background: 'linear-gradient(135deg, #3fb950 0%, #2ea043 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                margin: '0 auto 20px',
              }}
            >
              ✓
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e6edf3', marginBottom: 8 }}>
              All Set!
            </h1>
            <p style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.6 }}>
              {apiKey
                ? `Your API key is configured and ${selectedModel === 'deepseek-v4-flash' ? 'Flash' : 'Pro'} is set as your default model.`
                : `You can set up your API key later in Settings. ${selectedModel === 'deepseek-v4-flash' ? 'Flash' : 'Pro'} is your default model.`}
            </p>
          </div>
        )}

        {/* Navigation buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: step === 0 ? 'flex-end' : 'space-between',
            marginTop: 28,
            gap: 8,
          }}
        >
          {step > 0 && (
            <button
              onClick={handleBack}
              style={{
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 600,
                color: '#8b949e',
                background: 'transparent',
                border: '1px solid #30363d',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              style={{
                padding: '10px 24px',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                background: '#4f6fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleComplete}
              style={{
                padding: '10px 24px',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                background: '#3fb950',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Get Started
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
