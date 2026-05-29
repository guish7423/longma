import { useState, useEffect } from 'react';
import { useSessionStore } from '../../stores/session';
import { useChatStore } from '../../stores/chat';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  input_price_per_m: number;
  output_price_per_m: number;
  cached_input_price_per_m: number;
  supports_streaming: boolean;
  supports_reasoning: boolean;
}

const PROVIDERS = [
  { id: 'deepseek', label: 'DeepSeek', color: '#4f6fff' },
  { id: 'openai', label: 'OpenAI', color: '#10a37f' },
  { id: 'anthropic', label: 'Anthropic', color: '#d4a574' },
];

export default function Settings() {
  const {
    model, setModel,
    temperature, setTemperature,
    maxTokens, setMaxTokens,
    resetStats,
  } = useSessionStore();
  const { conversations, deleteConversation, newConversation } = useChatStore();

  const [provider, setProvider] = useState('deepseek');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [activeProvider, setActiveProvider] = useState('deepseek');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [baseUrls, setBaseUrls] = useState<Record<string, string>>({});
  const [, setProviderAccounts] = useState<Array<{ id: string; api_key: string; base_url?: string }>>([]);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load models and provider data on mount
  useEffect(() => {
    loadProviderData();
  }, []);

  const loadProviderData = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const allModels = await invoke<ModelInfo[]>('list_models');
      setModels(allModels);

      const activeProv = await invoke<string>('get_active_provider');
      setActiveProvider(activeProv);
      setProvider(activeProv);

      const cfg = await invoke<any>('get_config');
      setProviderAccounts(cfg.providers || []);

      // Populate API keys from provider accounts
      const keys: Record<string, string> = {};
      const urls: Record<string, string> = {};
      for (const p of cfg.providers || []) {
        keys[p.id] = p.api_key;
        if (p.base_url) urls[p.id] = p.base_url;
      }
      // Legacy deepseek key
      if (cfg.api_key) keys['deepseek'] = cfg.api_key;
      setApiKeys(keys);
      setBaseUrls(urls);
    } catch {}
  };

  const handleSwitchProvider = async (provId: string) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('switch_provider', { provider: provId });
      setActiveProvider(provId);
      setProvider(provId);
      setStatusMsg({ type: 'success', text: `Switched to ${PROVIDERS.find(p => p.id === provId)?.label || provId}` });
      setTimeout(() => setStatusMsg(null), 2000);
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: `Failed: ${e}` });
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const handleSaveProviderKey = async (provId: string) => {
    const key = apiKeys[provId] || '';
    if (!key.trim()) return;

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      if (provId === 'deepseek') {
        // Use save_api_key for DeepSeek (legacy)
        await invoke('save_api_key', { apiKey: key.trim() });
      }
      // Add/update provider account
      await invoke('update_config', {
        addProvider: {
          id: provId,
          api_key: key.trim(),
          base_url: baseUrls[provId] || null,
        },
      });
      await loadProviderData();
      setStatusMsg({ type: 'success', text: `${PROVIDERS.find(p => p.id === provId)?.label || provId} API key saved` });
      setTimeout(() => setStatusMsg(null), 2000);
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: `Failed: ${e}` });
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const handleRemoveProvider = async (provId: string) => {
    if (provId === 'deepseek') return; // Can't remove default provider
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('update_config', { removeProviderId: provId });
      await loadProviderData();
      setStatusMsg({ type: 'success', text: `Removed provider account` });
      setTimeout(() => setStatusMsg(null), 2000);
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: `Failed: ${e}` });
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const handleModelChange = async (m: string) => {
    await setModel(m);
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('switch_model', { model: m });
    setStatusMsg({ type: 'success', text: `Model switched` });
    setTimeout(() => setStatusMsg(null), 2000);
  };

  const handleClearAllConversations = () => {
    if (!confirm('Are you sure you want to delete all conversations? This cannot be undone.')) return;
    conversations.forEach((c) => deleteConversation(c.id));
    newConversation();
    setStatusMsg({ type: 'success', text: 'All conversations cleared' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const filteredModels = models.filter(m => m.provider === activeProvider);
  const provColors: Record<string, string> = { deepseek: '#4f6fff', openai: '#10a37f', anthropic: '#d4a574' };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Settings</h1>

      {statusMsg && (
        <div style={{ ...styles.statusBar, background: statusMsg.type === 'success' ? 'rgba(63, 185, 80, 0.15)' : 'rgba(248, 81, 73, 0.15)', color: statusMsg.type === 'success' ? '#3fb950' : '#f85149' }}>
          {statusMsg.text}
        </div>
      )}

      {/* ─── Multi-Provider ─── */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Provider</h2>
        <p style={styles.sectionDesc}>Choose your AI provider. Each provider requires its own API key.</p>

        {/* Provider Tabs */}
        <div style={styles.providerTabs}>
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              style={{
                ...styles.providerTab,
                ...(provider === p.id ? { ...styles.providerTabActive, borderColor: p.color, color: p.color } : {}),
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
              {p.label}
              {activeProvider === p.id && <span style={styles.activeBadge}>Active</span>}
            </button>
          ))}
        </div>

        {/* API Key + Base URL for selected provider */}
        {provider && (
          <div style={styles.providerConfig}>
            <div style={styles.configRow}>
              <label style={styles.configLabel}>API Key</label>
              <div style={styles.configInputRow}>
                <input
                  type="password"
                  value={apiKeys[provider] || ''}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                  placeholder={provider === 'deepseek' ? 'sk-...' : provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
                  style={styles.monoInput}
                />
                <button style={styles.primaryBtn} onClick={() => handleSaveProviderKey(provider)}>Save</button>
              </div>
            </div>
            <div style={styles.configRow}>
              <label style={styles.configLabel}>Base URL</label>
              <div style={styles.configInputRow}>
                <input
                  type="text"
                  value={baseUrls[provider] || ''}
                  onChange={(e) => setBaseUrls(prev => ({ ...prev, [provider]: e.target.value }))}
                  placeholder={`https://api.${provider}.com`}
                  style={styles.monoInput}
                />
                <button style={styles.ghostBtn} onClick={() => handleSaveProviderKey(provider)}>Update</button>
              </div>
            </div>
            {provider !== 'deepseek' && (
              <div style={{ marginTop: 8 }}>
                <button
                  style={styles.dangerBtnSmall}
                  onClick={() => handleRemoveProvider(provider)}
                >Remove Account</button>
              </div>
            )}
            <div style={styles.switchRow}>
              {activeProvider !== provider && (
                <button style={styles.primaryBtn} onClick={() => handleSwitchProvider(provider)}>
                  Activate {PROVIDERS.find(p => p.id === provider)?.label}
                </button>
              )}
              {activeProvider === provider && (
                <span style={styles.activeLabel}>✓ This provider is active</span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ─── Model Selection ─── */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Model</h2>
        <p style={styles.sectionDesc}>
          Models available for <span style={{ color: provColors[activeProvider] || 'var(--accent-primary)' }}>{activeProvider}</span>:
        </p>
        <div style={styles.modelGrid}>
          {filteredModels.map(m => {
            const isActive = model === m.id;
            return (
              <button
                key={m.id}
                style={isActive ? styles.modelCardActive : styles.modelCard}
                onClick={() => handleModelChange(m.id)}
              >
                <div style={styles.modelName}>
                  {m.name}
                  {m.supports_reasoning && <span style={styles.reasonTag}>R</span>}
                </div>
                <div style={styles.modelPrice}>
                  In: ${m.input_price_per_m.toFixed(2)}/M &middot; Out: ${m.output_price_per_m.toFixed(2)}/M
                </div>
                {m.cached_input_price_per_m < m.input_price_per_m && (
                  <div style={styles.modelCache}>Cache: ${m.cached_input_price_per_m.toFixed(3)}/M</div>
                )}
                {isActive && <div style={styles.modelTag}>Active</div>}
              </button>
            );
          })}
          {filteredModels.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 12 }}>
              No models available for this provider.
            </div>
          )}
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
            color: temperature > 0.8 ? 'var(--error)' : temperature > 0.5 ? 'var(--warning)' : 'var(--success)'
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
            <span style={styles.aboutLabel}>Active Provider</span>
            <span style={{ ...styles.aboutValue, color: provColors[activeProvider] || 'var(--text-primary)' }}>
              {activeProvider}
            </span>
          </div>
          <div style={styles.aboutItem}>
            <span style={styles.aboutLabel}>Framework</span>
            <span style={styles.aboutValue}>Tauri v2 + React 19</span>
          </div>
        </div>
      </section>

      {/* Background Agent */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Background Agent</h2>
        <p style={styles.sectionDesc}>Agent will continue running even when the window is closed.</p>
        <div style={styles.row}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>Minimize to tray</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Closing the window hides LongMa to the system tray instead of quitting</div>
          </div>
          <label style={styles.toggle}>
            <input type="checkbox" defaultChecked style={{ display: 'none' }} />
            <div style={styles.toggleTrack(true)}>
              <div style={styles.toggleThumb(true)} />
            </div>
          </label>
        </div>
      </section>

      {/* Danger Zone */}
      <section style={{ ...styles.section, borderColor: 'rgba(248, 81, 73, 0.3)' }}>
        <h2 style={{ ...styles.sectionTitle, color: 'var(--error)' }}>Danger Zone</h2>
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
  container: { flex: 1, overflow: 'auto', padding: '32px 40px', maxWidth: 720, margin: '0 auto' },
  heading: { fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24, letterSpacing: '-0.5px' },
  statusBar: { padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 16 },
  section: { marginBottom: 20, padding: '20px 24px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 12, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 },
  sectionDesc: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },

  // Provider
  providerTabs: { display: 'flex', gap: 8, marginBottom: 16 },
  providerTab: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', border: '1px solid var(--border-default)', borderRadius: 8, background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 150ms ease' },
  providerTabActive: { background: 'rgba(79, 111, 255, 0.06)', borderWidth: 1.5 },
  activeBadge: { fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: 'rgba(63, 185, 80, 0.15)', color: '#3fb950', marginLeft: 4 },
  providerConfig: { background: 'var(--bg-tertiary)', borderRadius: 10, padding: 16 },
  configRow: { marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 },
  configLabel: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' },
  configInputRow: { display: 'flex', gap: 8 },
  switchRow: { marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 },
  activeLabel: { fontSize: 12, fontWeight: 600, color: '#3fb950' },
  monoInput: { flex: 1, padding: '10px 14px', fontSize: 13, fontFamily: 'monospace', color: 'var(--text-primary)', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 8, outline: 'none' },

  // Model grid
  modelGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  modelCard: { padding: 14, background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' },
  modelCardActive: { padding: 14, background: 'rgba(79, 111, 255, 0.08)', border: '1px solid rgba(79, 111, 255, 0.4)', borderRadius: 10, cursor: 'pointer', textAlign: 'left' },
  modelName: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 },
  modelPrice: { fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 },
  modelCache: { fontSize: 11, color: 'var(--text-muted)' },
  modelTag: { display: 'inline-block', padding: '2px 8px', fontSize: 10, fontWeight: 600, borderRadius: 4, color: '#fff', background: 'var(--accent-primary)', marginTop: 6 },
  reasonTag: { fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(255, 165, 0, 0.2)', color: '#ffa500' },

  // Sliders
  sliderRow: { display: 'flex', alignItems: 'center', gap: 12 },
  sliderLabel: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, minWidth: 24 },
  slider: { flex: 1, height: 4, accentColor: 'var(--accent-primary)', cursor: 'pointer' },
  sliderValue: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace', minWidth: 48, textAlign: 'right' },

  // About
  aboutGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  aboutItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  aboutLabel: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' },
  aboutValue: { fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 },

  // Toggle
  toggle: { cursor: 'pointer', display: 'flex', flexShrink: 0 },
  toggleTrack: (on: boolean) => ({ width: 40, height: 22, borderRadius: 11, background: on ? 'var(--accent-primary)' : 'var(--bg-tertiary)', border: `1px solid ${on ? 'var(--accent-primary)' : 'var(--border-default)'}`, display: 'flex', alignItems: 'center', padding: '0 3px', justifyContent: on ? 'flex-end' : 'flex-start', transition: 'all 200ms ease', boxShadow: on ? '0 0 8px rgba(79, 111, 255, 0.3)' : 'none' }),
  toggleThumb: (on: boolean) => ({ width: 16, height: 16, borderRadius: '50%', background: on ? '#fff' : 'var(--text-muted)', transition: 'all 200ms ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }),

  // Buttons
  primaryBtn: { padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--accent-primary)', border: 'none', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' },
  ghostBtn: { padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' },
  dangerBtn: { padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'var(--error)', background: 'rgba(248, 81, 73, 0.1)', border: '1px solid rgba(248, 81, 73, 0.3)', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' },
  dangerBtnSmall: { padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'var(--error)', background: 'rgba(248, 81, 73, 0.1)', border: '1px solid rgba(248, 81, 73, 0.3)', borderRadius: 6, cursor: 'pointer' },
};
