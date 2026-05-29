import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import GlassPanel from '../../design-system/GlassPanel';

interface SystemResources {
  cpu_usage: number;
  memory_used: number;
  memory_total: number;
  memory_percent: number;
  disk_used: number;
  disk_total: number;
  disk_percent: number;
  process_count: number;
  uptime_secs: number;
}

interface HealthStatus {
  system: SystemResources | null;
  appVersion: string;
  model: string;
  hasApiKey: boolean;
  cacheStats: { hot: number; warm: number; cold: number; total: number; hits: number; misses: number; hitRate: number } | null;
  tickHeartbeat: { heart_rate_secs: number; mode: string; last_activity: number } | null;
  systemTts: 'available' | 'unavailable' | 'checking';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatUptime(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function HealthPanel() {
  const [health, setHealth] = useState<HealthStatus>({
    system: null, appVersion: '', model: '', hasApiKey: false,
    cacheStats: null, tickHeartbeat: null, systemTts: 'checking',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sys, appInfo, cache, tts] = await Promise.all([
        invoke<SystemResources>('get_system_resources').catch(() => null),
        invoke<any>('get_app_info').catch(() => ({ name: 'LongMa', version: '0.1.0', model: 'unknown' })),
        invoke<any>('get_cache_stats').catch(() => null),
        invoke<any>('detect_tts').catch(() => ({ available: false, engines: [], platform: '' })),
      ]);

      const config = await invoke<any>('get_config').catch(() => null);

      setHealth({
        system: sys,
        appVersion: appInfo?.version || '0.1.0',
        model: config?.model || 'deepseek-v4-flash',
        hasApiKey: !!(config?.api_key || config?.providers?.length > 0),
        cacheStats: cache ? {
          hot: cache.hot_count || 0,
          warm: cache.warm_count || 0,
          cold: cache.cold_count || 0,
          total: cache.total_entries || 0,
          hits: cache.hits || 0,
          misses: cache.misses || 0,
          hitRate: (cache.hits + cache.misses) > 0
            ? cache.hits / (cache.hits + cache.misses)
            : 0,
        } : null,
        tickHeartbeat: null,
        systemTts: tts?.available ? 'available' : 'unavailable',
      });
    } catch (e: any) {
      setError(String(e));
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const sys = health.system;

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={styles.pageTitle}>System Health</h2>
        <button style={styles.refreshBtn} onClick={refresh} className="click-scale">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      {loading && !sys ? (
        <GlassPanel variant="elevated" style={{ ...styles.panel, alignItems: 'center', padding: 48 }}>
          <div style={{ width: 24, height: 24, border: '2px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 12 }}>Gathering system information...</span>
        </GlassPanel>
      ) : error ? (
        <GlassPanel variant="elevated" style={{ ...styles.panel, background: 'rgba(248, 81, 73, 0.06)', border: '1px solid rgba(248, 81, 73, 0.2)' }}>
          <span style={{ color: 'var(--error)', fontSize: 13 }}>Error: {error}</span>
        </GlassPanel>
      ) : (
        <>
          {/* System Resources */}
          <GlassPanel variant="elevated" style={styles.panel}>
            <h3 style={styles.sectionTitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
              System Resources
            </h3>
            <div style={styles.grid}>
              <HealthCard label="CPU" value={sys ? `${sys.cpu_usage.toFixed(1)}%` : '...'} color="var(--info)" />
              <HealthCard label="Memory" value={sys ? `${formatBytes(sys.memory_used)} / ${formatBytes(sys.memory_total)}` : '...'} color={sys && sys.memory_percent > 80 ? 'var(--error)' : 'var(--success)'} />
              <HealthCard label="Disk" value={sys ? `${formatBytes(sys.disk_used)} / ${formatBytes(sys.disk_total)}` : '...'} color={sys && sys.disk_percent > 85 ? 'var(--error)' : 'var(--success)'} />
              <HealthCard label="Processes" value={sys ? `${sys.process_count}` : '...'} color="var(--text-muted)" />
              <HealthCard label="Uptime" value={sys ? formatUptime(sys.uptime_secs) : '...'} color="var(--text-muted)" />
              <HealthCard label="Memory %" value={sys ? `${sys.memory_percent.toFixed(1)}%` : '...'} color={sys && sys.memory_percent > 80 ? 'var(--error)' : sys && sys.memory_percent > 60 ? 'var(--warning)' : 'var(--success)'} />
            </div>

            {sys && (
              <div style={styles.barGroup}>
                <Bar label="Memory" pct={sys.memory_percent} color={sys.memory_percent > 80 ? 'var(--error)' : sys.memory_percent > 60 ? 'var(--warning)' : 'var(--success)'} />
                <Bar label="Disk" pct={sys.disk_percent} color={sys.disk_percent > 85 ? 'var(--error)' : sys.disk_percent > 70 ? 'var(--warning)' : 'var(--success)'} />
              </div>
            )}
          </GlassPanel>

          {/* Application Status */}
          <GlassPanel variant="elevated" style={styles.panel}>
            <h3 style={styles.sectionTitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
              </svg>
              Application Status
            </h3>
            <div style={styles.grid}>
              <HealthCard label="Version" value={health.appVersion} color="var(--text-muted)" />
              <HealthCard label="Model" value={health.model} color="var(--accent-primary)" />
              <StatusCard label="API Key" ok={health.hasApiKey} okLabel="Configured" failLabel="Missing" />
              <StatusCard label="System TTS" ok={health.systemTts === 'available'} okLabel="Available" failLabel="Not found" />
              <StatusCard label="Cache" ok={health.cacheStats !== null} okLabel={`${health.cacheStats?.total || 0} entries`} failLabel="Not started" />
              <HealthCard label="Hot Cache" value={`${health.cacheStats?.hot || 0} entries`} color="var(--warning)" />
              <HealthCard label="Cache Hit Rate" value={health.cacheStats ? `${(health.cacheStats.hitRate * 100).toFixed(0)}%` : 'N/A'} color={health.cacheStats && health.cacheStats.hitRate > 0.8 ? 'var(--success)' : 'var(--text-muted)'} />
            </div>
          </GlassPanel>

          {/* Quick Actions */}
          <GlassPanel variant="elevated" style={styles.panel}>
            <h3 style={styles.sectionTitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Quick Actions
            </h3>
            <div style={styles.actionRow}>
              <button style={styles.actionBtn} onClick={async () => {
                try { await invoke('reset_budget'); refresh(); } catch {}
              }}>
                Reset Budget
              </button>
              <button style={styles.actionBtn} onClick={async () => {
                try {
                  await invoke('invalidate_conversation_cache', { conversationId: 0 });
                  refresh();
                } catch {}
              }}>
                Clear Cache
              </button>
              <button style={styles.actionBtn} onClick={async () => {
                try {
                  await invoke('reset_stats');
                } catch {}
                refresh();
              }}>
                Reset Stats
              </button>
              <button style={styles.actionBtn} onClick={refresh}>
                Full Refresh
              </button>
            </div>
          </GlassPanel>
        </>
      )}
    </div>
  );
}

function HealthCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={styles.card}>
      <span style={styles.cardLabel}>{label}</span>
      <span style={{ ...styles.cardValue, color }}>{value}</span>
    </div>
  );
}

function StatusCard({ label, ok, okLabel, failLabel }: { label: string; ok: boolean; okLabel: string; failLabel: string }) {
  return (
    <div style={styles.card}>
      <span style={styles.cardLabel}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: ok ? 'var(--success)' : 'var(--error)' }} />
        <span style={{ ...styles.cardValue, color: ok ? 'var(--success)' : 'var(--error)', fontSize: 12 }}>
          {ok ? okLabel : failLabel}
        </span>
      </div>
    </div>
  );
}

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={styles.barRow}>
      <span style={styles.barLabel}>{label}</span>
      <div style={styles.barTrack}>
        <div style={{ ...styles.barFill, width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span style={{ ...styles.barValue, color }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

const styles: Record<string, any> = {
  container: { flex: 1, padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900, margin: '0 auto', width: '100%' },
  pageTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' },
  refreshBtn: { padding: '8px 16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 },
  panel: { padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 },
  card: { padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 },
  cardLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  cardValue: { fontSize: 13, fontWeight: 600 },
  barGroup: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 },
  barRow: { display: 'flex', alignItems: 'center', gap: 10 },
  barLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', width: 56, flexShrink: 0 },
  barTrack: { flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, transition: 'width 0.5s ease' },
  barValue: { fontSize: 11, fontWeight: 700, width: 40, textAlign: 'right' },
  actionRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  actionBtn: { padding: '8px 16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 150ms ease' },
};
