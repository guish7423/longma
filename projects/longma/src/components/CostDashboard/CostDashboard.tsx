import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSessionStore } from '../../stores/session';

interface ConversationCost {
  id: number;
  title: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_hit_tokens: number;
  total_cost: number;
  cache_hit_rate: number;
  message_count: number;
}

interface CostSummary {
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_hit_tokens: number;
  total_cache_miss_tokens: number;
  total_cost: number;
  total_sessions: number;
  cache_hit_rate: number;
  model_breakdown: Record<string, number>;
}

export default function CostDashboard() {
  const { model } = useSessionStore();
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [conversations, setConversations] = useState<ConversationCost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      invoke<CostSummary>('get_cost_summary'),
      invoke<ConversationCost[]>('get_conversation_costs'),
    ]).then(([s, c]) => {
      setSummary(s);
      setConversations(c);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading dashboard...</div>
      </div>
    );
  }

  const fmt = (n: number) => n.toLocaleString();
  const fmtCost = (c: number) => c < 0.001 ? '<$0.001' : `$${c.toFixed(4)}`;
  const fmtRate = (r: number) => `${(r * 100).toFixed(1)}%`;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Cost Dashboard</h1>
        <div style={styles.modelBadge}>
          {model === 'deepseek-v4-pro' ? 'V4 Pro' : 'V4 Flash'}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={styles.cards}>
        <div style={{ ...styles.card, borderLeft: '3px solid #4f6fff' }}>
          <span style={styles.cardLabel}>Total Cost</span>
          <span style={styles.cardValue(summary?.total_cost ?? 0)}>
            {summary ? fmtCost(summary.total_cost) : '—'}
          </span>
        </div>
        <div style={{ ...styles.card, borderLeft: '3px solid #7c3aed' }}>
          <span style={styles.cardLabel}>Sessions</span>
          <span style={styles.cardNumber}>{summary?.total_sessions ?? 0}</span>
        </div>
        <div style={{ ...styles.card, borderLeft: '3px solid #2ea043' }}>
          <span style={styles.cardLabel}>Input Tokens</span>
          <span style={styles.cardNumber}>{summary ? fmt(summary.total_input_tokens) : '—'}</span>
          <span style={styles.cardSub}>
            Cache: {summary ? fmt(summary.total_cache_hit_tokens) : '—'} / Miss: {summary ? fmt(summary.total_cache_miss_tokens) : '—'}
          </span>
        </div>
        <div style={{ ...styles.card, borderLeft: '3px solid #d29922' }}>
          <span style={styles.cardLabel}>Output Tokens</span>
          <span style={styles.cardNumber}>{summary ? fmt(summary.total_output_tokens) : '—'}</span>
        </div>
      </div>

      {/* Cache Hit Rate Bar */}
      {summary && (
        <div style={styles.cacheSection}>
          <div style={styles.cacheHeader}>
            <span style={styles.sectionTitle}>Cache Hit Rate</span>
            <span style={styles.cachePercent(summary.cache_hit_rate)}>{fmtRate(summary.cache_hit_rate)}</span>
          </div>
          <div style={styles.progressTrack}>
            <div style={styles.progressFill(summary.cache_hit_rate)} />
          </div>
          <div style={styles.cacheLabels}>
            <span>Hit: {fmt(summary.total_cache_hit_tokens)}</span>
            <span>Miss: {fmt(summary.total_cache_miss_tokens)}</span>
          </div>
        </div>
      )}

      {/* Model Breakdown */}
      {summary && Object.keys(summary.model_breakdown).length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Model Usage</h2>
          <div style={styles.modelList}>
            {Object.entries(summary.model_breakdown).map(([m, cost]) => (
              <div key={m} style={styles.modelRow}>
                <span style={styles.modelName}>{m}</span>
                <span style={styles.modelCost}>{fmtCost(cost)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-Conversation Breakdown */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Conversation Breakdown</h2>
        {conversations.length === 0 ? (
          <p style={styles.empty}>No conversation data yet. Start chatting to see costs.</p>
        ) : (
          <div style={styles.table}>
            <div style={styles.tableHeader}>
              <span style={styles.colNum}>#</span>
              <span style={styles.colTitle}>Conversation</span>
              <span style={styles.colMsgs}>Msgs</span>
              <span style={styles.colTokens}>Tokens</span>
              <span style={styles.colCache}>Cache</span>
              <span style={styles.colCost}>Cost</span>
            </div>
            {conversations.map((conv, i) => (
              <div key={conv.id} style={styles.tableRow}>
                <span style={styles.colNum}>{i + 1}</span>
                <span style={styles.colTitle}>{conv.title}</span>
                <span style={styles.colMsgs}>{conv.message_count}</span>
                <span style={styles.colTokens}>{fmt(conv.total_input_tokens + conv.total_output_tokens)}</span>
                <span style={styles.colCache}>{fmtRate(conv.cache_hit_rate)}</span>
                <span style={styles.colCost}>{fmtCost(conv.total_cost)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, any> = {
  container: {
    flex: 1,
    overflow: 'auto',
    padding: '32px 40px',
    background: 'var(--bg-primary)',
  },
  loading: {
    textAlign: 'center' as const,
    paddingTop: 120,
    fontSize: 16,
    color: 'var(--text-muted)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
    margin: 0,
  },
  modelBadge: {
    padding: '4px 14px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    background: 'rgba(79, 111, 255, 0.12)',
    color: 'var(--accent-primary)',
    border: '1px solid rgba(79, 111, 255, 0.25)',
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  card: {
    background: 'var(--bg-secondary)',
    borderRadius: 12,
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  cardValue: (cost: number) => ({
    fontSize: 28,
    fontWeight: 700,
    color: cost > 0.1 ? '#f0883e' : 'var(--accent-success)',
    fontVariantNumeric: 'tabular-nums' as const,
  }),
  cardNumber: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums' as const,
  },
  cardSub: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  cacheSection: {
    background: 'var(--bg-secondary)',
    borderRadius: 12,
    padding: '18px 20px',
    marginBottom: 24,
  },
  cacheHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cachePercent: (rate: number) => ({
    fontSize: 16,
    fontWeight: 700,
    color: rate > 0.8 ? 'var(--accent-success)' : rate > 0.5 ? '#d29922' : 'var(--accent-danger)',
  }),
  progressTrack: {
    height: 8,
    background: '#21262d',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: (rate: number) => ({
    width: `${(rate * 100).toFixed(1)}%`,
    height: '100%',
    background: rate > 0.8
      ? 'linear-gradient(90deg, #2ea043, #3fb950)'
      : rate > 0.5
      ? 'linear-gradient(90deg, #d29922, #e3b341)'
      : 'linear-gradient(90deg, #da3633, #f85149)',
    borderRadius: 4,
    transition: 'width 0.5s ease',
  }),
  cacheLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 6,
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 12,
    margin: 0,
  },
  modelList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  modelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: 'var(--bg-secondary)',
    borderRadius: 8,
    fontSize: 13,
  },
  modelName: {
    color: 'var(--text-secondary)',
  },
  modelCost: {
    color: 'var(--text-primary)',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums' as const,
  },
  empty: {
    color: 'var(--text-muted)',
    fontSize: 13,
    padding: '16px 0',
  },
  table: {
    display: 'flex',
    flexDirection: 'column' as const,
    borderRadius: 10,
    overflow: 'hidden',
    border: '1px solid var(--border-default)',
  },
  tableHeader: {
    display: 'flex',
    padding: '10px 14px',
    background: 'var(--bg-tertiary)',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    borderBottom: '1px solid var(--border-default)',
  },
  tableRow: {
    display: 'flex',
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border-default)',
    background: 'var(--bg-secondary)',
    ':lastChild': { borderBottom: 'none' },
  },
  colNum: { width: 36, flexShrink: 0 },
  colTitle: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  colMsgs: { width: 56, textAlign: 'right' as const, flexShrink: 0 },
  colTokens: { width: 90, textAlign: 'right' as const, flexShrink: 0, fontVariantNumeric: 'tabular-nums' as const },
  colCache: { width: 70, textAlign: 'right' as const, flexShrink: 0 },
  colCost: { width: 90, textAlign: 'right' as const, flexShrink: 0, fontWeight: 600, fontVariantNumeric: 'tabular-nums' as const },
};
