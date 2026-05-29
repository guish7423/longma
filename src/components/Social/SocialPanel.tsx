import { useState, useEffect } from 'react';
import GlassPanel from '../../design-system/GlassPanel';

export default function SocialPanel() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [savedWebhook, setSavedWebhook] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load saved webhook from config on mount
  useEffect(() => {
    (async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const cfg = await invoke<any>('get_config');
        if (cfg.social_webhooks?.[0]?.url) {
          setSavedWebhook(cfg.social_webhooks[0].url);
          setWebhookUrl(cfg.social_webhooks[0].url);
        }
      } catch { /* config may not have social_webhooks yet */ }
    })();
  }, []);

  const saveWebhook = async () => {
    if (!webhookUrl.trim()) return;
    setSaving(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('update_config', {
        socialWebhooks: [{ platform: 'discord', url: webhookUrl.trim() }],
      });
      setSavedWebhook(webhookUrl.trim());
      setStatus('✅ Webhook URL saved');
      setTimeout(() => setStatus(''), 2000);
    } catch (e: any) {
      setStatus(`❌ Failed to save: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscordSend = async () => {
    if (!savedWebhook.trim() || !message.trim()) {
      setStatus('Please configure a Discord webhook URL and enter a message.');
      return;
    }
    try {
      const res = await fetch(savedWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'LongMa',
          content: message,
        }),
      });
      if (res.ok) {
        setStatus('✅ Message sent to Discord!');
        setMessage('');
      } else {
        setStatus(`❌ Discord webhook error: ${res.status}`);
      }
    } catch (e: any) {
      setStatus(`❌ Failed: ${e.message}`);
    }
    setTimeout(() => setStatus(''), 4000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatus('❌ Clipboard access denied');
    }
  };

  const handleWeChat = () => {
    if (!message.trim()) {
      setStatus('Please enter a message first.');
      return;
    }
    handleCopy();
    setStatus('📋 Message copied! Paste into WeChat manually.');
    setTimeout(() => setStatus(''), 4000);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Social Share
        </h2>
        <span style={styles.subtitle}>Share conversations to your favorite platforms</span>
      </div>

      {status && (
        <div style={{ ...styles.statusBar, background: status.startsWith('✅') || status.startsWith('📋') ? 'rgba(63, 185, 80, 0.1)' : 'rgba(248, 81, 73, 0.1)', color: status.startsWith('✅') || status.startsWith('📋') ? '#3fb950' : '#f85149' }}>
          {status}
        </div>
      )}

      {/* Message Input */}
      <GlassPanel variant="elevated" style={styles.panel}>
        <h3 style={styles.sectionTitle}>Message to Share</h3>
        <textarea
          style={styles.messageInput}
          placeholder="Type or paste the message/content you want to share..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
        />
        <div style={styles.btnRow}>
          <button style={styles.copyBtn} onClick={handleCopy}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </GlassPanel>

      {/* Discord */}
      <GlassPanel variant="elevated" style={styles.panel}>
        <h3 style={styles.sectionTitle}>
          <span style={{ color: '#5865F2' }}>■</span> Discord
        </h3>
        <div style={styles.webhookRow}>
          <input
            style={styles.webhookInput}
            placeholder="Discord Webhook URL"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          <button style={styles.saveBtn} onClick={saveWebhook} disabled={saving}>
            {saving ? '...' : savedWebhook === webhookUrl.trim() && savedWebhook ? 'Saved ✓' : 'Save'}
          </button>
        </div>
        <button style={styles.sendBtn} onClick={handleDiscordSend}>
          Send to Discord
        </button>
      </GlassPanel>

      {/* WeChat */}
      <GlassPanel variant="elevated" style={styles.panel}>
        <h3 style={styles.sectionTitle}>
          <span style={{ color: '#07C160' }}>■</span> WeChat
        </h3>
        <div style={styles.wechatNote}>
          WeChat does not provide a public API. LongMa copies to clipboard — you paste manually.
        </div>
        <button style={styles.wechatBtn} onClick={handleWeChat}>
          Copy & Open WeChat
        </button>
      </GlassPanel>

      {/* More Platforms */}
      <GlassPanel variant="default" style={styles.morePanel}>
        <h3 style={styles.sectionTitle}>Coming Soon</h3>
        <div style={styles.platformGrid}>
          <div style={styles.platform}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            <span style={styles.platLabel}>Email</span>
          </div>
          <div style={styles.platform}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>
            <span style={styles.platLabel}>Telegram</span>
          </div>
          <div style={styles.platform}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            <span style={styles.platLabel}>SMS</span>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}

const styles: Record<string, any> = {
  container: { flex: 1, padding: 24, overflow: 'auto', maxWidth: 700, margin: '0 auto', width: '100%' },
  header: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 },
  subtitle: { fontSize: 13, color: 'var(--text-muted)' },
  statusBar: { padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 12 },
  panel: { marginBottom: 16, padding: 20, borderRadius: 12 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 },
  messageInput: { width: '100%', padding: 12, fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' },
  btnRow: { display: 'flex', gap: 8, marginTop: 8 },
  copyBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 6, cursor: 'pointer' },
  webhookRow: { display: 'flex', gap: 8, marginBottom: 10 },
  webhookInput: { flex: 1, padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', color: 'var(--text-primary)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, outline: 'none' },
  saveBtn: { padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#fff', background: 'var(--accent-primary)', border: 'none', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap', minWidth: 80 },
  sendBtn: { width: '100%', padding: '10px', fontSize: 13, fontWeight: 600, color: '#fff', background: '#5865F2', border: 'none', borderRadius: 8, cursor: 'pointer' },
  wechatNote: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 },
  wechatBtn: { width: '100%', padding: '10px', fontSize: 13, fontWeight: 600, color: '#fff', background: '#07C160', border: 'none', borderRadius: 8, cursor: 'pointer' },
  morePanel: { padding: 16, borderRadius: 12, marginBottom: 16 },
  platformGrid: { display: 'flex', gap: 16, marginTop: 10 },
  platform: { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 },
  platLabel: { fontSize: 12, fontWeight: 500 },
};
