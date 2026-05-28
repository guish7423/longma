import { useState } from 'react';
import { useSessionStore } from '../../stores/session';
import { useChatStore } from '../../stores/chat';

const MODEL_FLASH = 'deepseek-v4-flash';
const MODEL_PRO = 'deepseek-v4-pro';

export default function Settings() {
  const {
    model, setModel,
    temperature, setTemperature,
    maxTokens, setMaxTokens,
    hasApiKey,
    resetStats,
  } = useSessionStore();
  const { conversations, deleteConversation, newConversation } = useChatStore();

  const [showApiInput, setShowApiInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    try {
      await useSessionStore.getState().saveApiKey(apiKeyInput.trim());
      setApiKeyInput('');
      setShowApiInput(false);
      setStatusMsg({ type: 'success', text: 'API key updated successfully' });
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to save API key' });
    }
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleClearAllConversations = () => {
    if (!confirm('Are you sure you want to delete all conversations? This cannot be undone.')) return;
    conversations.forEach((c) => deleteConversation(c.id));
    newConversation();
    setStatusMsg({ type: 'success', text: 'All conversations cleared' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleModelChange = async (m: string) => {
    await setModel(m);
    await useSessionStore.getState().switchModel(m);
    setStatusMsg({ type: 'success', text: `Model switched to ${m === MODEL_FLASH ? 'Flash' : 'Pro'}` });
    setTimeout(() => setStatusMsg(null), 2000);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Settings</h1>

      {statusMsg && (
        <div style={{ ...styles.statusBar, background: statusMsg.type === 'success' ? 'rgba(63, 185, 80, 0.15)' : 'rgba(248, 81, 73, 0.15)', color: statusMsg.type === 'success' ? '#3fb950' : '#f85149' }}>
          {statusMsg.text}
        </div>
      )}

      {/* API Key */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>API Key</h2>
        <p style={styles.sectionDesc}>
          Your DeepSeek API key is stored locally and never shared.
        </p>
        {!showApiInput ? (
          <div style={styles.row}>
            <div style={styles.keyDisplay}>
              {hasApiKey ? (
                <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-secondary)' }}>
                  sk-...{Array(32).fill('•').join('')}
                </span>
              ) : (
                <span style={{ color: 'var(--accent-danger)', fontSize: 13 }}>Not configured</span>
              )}
            </div>
            <button style={styles.secondaryBtn} onClick={() => setShowApiInput(true)}>
              {hasApiKey ? 'Change' : 'Set Key'}
            </button>
          </div>
        ) : (
          <div style={styles.apiKeyForm}>
            <div style={styles.inputRow}>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-..."
                style={styles.monoInput}
              />
              <button style={styles.iconBtn} onClick={() => setShowKey(!showKey)} title={showKey ? 'Hide' : 'Show'}>
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
            <div style={styles.btnRow}>
              <button style={styles.primaryBtn} onClick={handleSaveApiKey}>Save</button>
              <button style={styles.ghostBtn} onClick={() => { setShowApiInput(false); setApiKeyInput(''); }}>Cancel</button>
            </div>
          </div>
        )}
      </section>

      {/* Model Selection */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Model</h2>
        <p style={styles.sectionDesc}>
          Choose between Flash (faster, cheaper) and Pro (more capable).
        </p>
        <div style={styles.modelRow}>
          <button
            style={model === MODEL_FLASH ? styles.modelCardActive : styles.modelCard}
            onClick={() => handleModelChange(MODEL_FLASH)}
          >
            <div style={styles.modelName}>DeepSeek Flash</div>
            <div style={styles.modelPrice}>Input: $0.07/M • Output: $0.28/M</div>
            <div style={styles.modelCache}>Cache: $0.006/M</div>
            <div style={styles.modelTag}>Default</div>
          </button>
          <button
            style={model === MODEL_PRO ? styles.modelCardActive : styles.modelCard}
            onClick={() => handleModelChange(MODEL_PRO)}
          >
            <div style={styles.modelName}>DeepSeek Pro</div>
            <div style={styles.modelPrice}>Input: $0.42/M • Output: $1.68/M</div>
            <div style={styles.modelCache}>Cache: $0.036/M</div>
            <div style={styles.modelTag}>Premium</div>
          </button>
        </div>
      </section>

      {/* Temperature */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Temperature</h2>
        <p style={styles.sectionDesc}>
          Controls randomness: lower for focused answers, higher for creativity.
        </p>
        <div style={styles.sliderRow}>
          <span style={styles.sliderLabel}>0.0</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            style={styles.slider}
          />
          <span style={styles.sliderLabel}>1.0</span>
          <span style={{
            ...styles.sliderValue,
            color: temperature > 0.8 ? 'var(--accent-danger)' : temperature > 0.5 ? 'var(--accent-warning)' : 'var(--accent-success)'
          }}>
            {temperature.toFixed(2)}
          </span>
        </div>
      </section>

      {/* Max Tokens */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Max Tokens</h2>
        <p style={styles.sectionDesc}>Maximum response length.</p>
        <div style={styles.sliderRow}>
          <span style={styles.sliderLabel}>256</span>
          <input
            type="range"
            min="256"
            max="32768"
            step="256"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            style={styles.slider}
          />
          <span style={styles.sliderLabel}>32K</span>
          <span style={styles.sliderValue}>{maxTokens.toLocaleString()}</span>
        </div>
      </section>

      {/* About */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>About</h2>
        <div style={styles.aboutGrid}>
          <div style={styles.aboutItem}>
            <span style={styles.aboutLabel}>App</span>
            <span style={styles.aboutValue}>LongMa</span>
          </div>
          <div style={styles.aboutItem}>
            <span style={styles.aboutLabel}>Version</span>
            <span style={styles.aboutValue}>0.1.0</span>
          </div>
          <div style={styles.aboutItem}>
            <span style={styles.aboutLabel}>Engine</span>
            <span style={styles.aboutValue}>DeepSeek {model === MODEL_FLASH ? 'Flash' : 'Pro'}</span>
          </div>
          <div style={styles.aboutItem}>
            <span style={styles.aboutLabel}>Framework</span>
            <span style={styles.aboutValue}>Tauri v2 + React 19</span>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section style={{ ...styles.section, borderColor: 'rgba(248, 81, 73, 0.3)' }}>
        <h2 style={{ ...styles.sectionTitle, color: 'var(--accent-danger)' }}>Danger Zone</h2>
        <p style={styles.sectionDesc}>Destructive actions that cannot be undone.</p>
        <div style={styles.row}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>Clear all conversations</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Permanently delete all chat history</div>
          </div>
          <button style={styles.dangerBtn} onClick={handleClearAllConversations}>
            Clear All
          </button>
        </div>
        <div style={{ ...styles.row, marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>Reset cost stats</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Reset token usage and cost counters</div>
          </div>
          <button style={styles.dangerBtn} onClick={() => { resetStats(); setStatusMsg({ type: 'success', text: 'Stats reset' }); setTimeout(() => setStatusMsg(null), 2000); }}>
            Reset
          </button>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, any> = {
  container: {
    flex: 1,
    overflow: 'auto',
    padding: '32px 40px',
    maxWidth: 680,
    margin: '0 auto',
  },
  heading: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 24,
    letterSpacing: '-0.5px',
  },
  statusBar: {
    padding: '10px 16px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 16,
  },
  section: {
    marginBottom: 28,
    padding: '20px 24px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-default)',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 12,
    color: 'var(--text-muted)',
    marginBottom: 16,
    lineHeight: 1.5,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  keyDisplay: {
    flex: 1,
    padding: '10px 14px',
    background: 'var(--bg-tertiary)',
    borderRadius: 8,
    border: '1px solid var(--border-default)',
  },
  secondaryBtn: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  apiKeyForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  monoInput: {
    flex: 1,
    padding: '10px 14px',
    fontSize: 13,
    fontFamily: 'monospace',
    color: 'var(--text-primary)',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    outline: 'none',
  },
  iconBtn: {
    padding: '8px 12px',
    fontSize: 14,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    cursor: 'pointer',
  },
  btnRow: {
    display: 'flex',
    gap: 8,
  },
  primaryBtn: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    background: 'var(--accent-primary)',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  ghostBtn: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    background: 'transparent',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    cursor: 'pointer',
  },
  modelRow: {
    display: 'flex',
    gap: 12,
  },
  modelCard: {
    flex: 1,
    padding: 16,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-default)',
    borderRadius: 10,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  },
  modelCardActive: {
    flex: 1,
    padding: 16,
    background: 'rgba(79, 111, 255, 0.08)',
    border: '1px solid rgba(79, 111, 255, 0.4)',
    borderRadius: 10,
    cursor: 'pointer',
    textAlign: 'left',
  },
  modelName: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 6,
  },
  modelPrice: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginBottom: 2,
  },
  modelCache: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginBottom: 8,
  },
  modelTag: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: 10,
    fontWeight: 600,
    borderRadius: 4,
    color: '#fff',
    background: 'var(--accent-primary)',
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  sliderLabel: {
    fontSize: 11,
    color: 'var(--text-muted)',
    fontWeight: 500,
    minWidth: 24,
  },
  slider: {
    flex: 1,
    height: 4,
    accentColor: 'var(--accent-primary)',
    cursor: 'pointer',
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontFamily: 'monospace',
    minWidth: 48,
    textAlign: 'right',
  },
  aboutGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  aboutItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  aboutLabel: {
    fontSize: 11,
    color: 'var(--text-muted)',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  aboutValue: {
    fontSize: 13,
    color: 'var(--text-primary)',
    fontWeight: 500,
  },
  dangerBtn: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--accent-danger)',
    background: 'rgba(248, 81, 73, 0.1)',
    border: '1px solid rgba(248, 81, 73, 0.3)',
    borderRadius: 8,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
};
