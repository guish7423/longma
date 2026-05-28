import { useSessionStore } from '../../stores/session';

export default function BottomBar() {
  const { model, stats, agentState } = useSessionStore();

  const cacheRate = stats.total_input_tokens > 0
    ? ((stats.total_cache_hit_tokens / stats.total_input_tokens) * 100).toFixed(1)
    : '—';

  return (
    <div style={styles.container}>
      <div style={styles.left}>
        <div style={styles.modelBadge(model)}>
          <span style={styles.modelDot(model)} />
          {model === 'deepseek-v4-pro' ? 'V4 Pro' : 'V4 Flash'}
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Cache</span>
          <span style={styles.statValue}>{cacheRate}%</span>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Tokens</span>
          <span style={styles.statValue}>{stats.total_input_tokens.toLocaleString()}</span>
        </div>
        <div style={styles.divider} />
        <div style={styles.stat}>
          <span style={styles.statLabel}>Cost</span>
          <span style={styles.statValue}>
            ${stats.total_cost < 0.01 ? '<0.01' : stats.total_cost.toFixed(4)}
          </span>
        </div>
        {agentState === 'thinking' && (
          <div style={styles.thinking}>
            <div style={styles.thinkingDot} />
            thinking
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, any> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    borderTop: '1px solid var(--border-default)',
    background: 'var(--bg-secondary)',
    fontSize: 12,
    flexShrink: 0,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  modelBadge: (model: string) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    background: model === 'deepseek-v4-pro' ? 'rgba(124, 58, 237, 0.15)' : 'rgba(79, 111, 255, 0.12)',
    color: model === 'deepseek-v4-pro' ? '#a78bfa' : 'var(--accent-primary)',
    border: `1px solid ${model === 'deepseek-v4-pro' ? 'rgba(124, 58, 237, 0.3)' : 'rgba(79, 111, 255, 0.25)'}`,
  }),
  modelDot: (model: string) => ({
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: model === 'deepseek-v4-pro' ? '#a78bfa' : 'var(--accent-primary)',
  }),
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    color: 'var(--text-muted)',
  },
  statValue: {
    color: 'var(--text-secondary)',
    fontVariantNumeric: 'tabular-nums',
  },
  divider: {
    width: 1,
    height: 12,
    background: 'var(--border-default)',
  },
  thinking: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: 'var(--accent-warning)',
    fontWeight: 500,
  },
  thinkingDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--accent-warning)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
};
