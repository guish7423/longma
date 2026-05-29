import { useState } from 'react';
import { useSessionStore } from '../../stores/session';

interface SidebarProps {
  conversations: { id: number; title: string }[];
  currentConversationId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
}

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelect,
  onNew,
  onDelete,
}: SidebarProps) {
  const { agentState, view, setView } = useSessionStore();
  const [hoveredConv, setHoveredConv] = useState<number | null>(null);

  return (
    <div style={styles.container}>
      {/* Logo + Brand */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <span style={styles.title}>LongMa</span>
        <div style={styles.badge}>v2</div>
      </div>

      {/* New Chat */}
      <button style={styles.newChat} onClick={onNew} className="hover-lift click-scale">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Chat
      </button>

      {/* Conversation List */}
      <div style={styles.list}>
        {conversations.map((conv) => (
          <div
            key={conv.id}
            style={{
              ...styles.convItem,
              ...(conv.id === currentConversationId ? styles.convItemActive : {}),
            }}
            onClick={() => onSelect(conv.id)}
            onMouseEnter={() => setHoveredConv(conv.id)}
            onMouseLeave={() => setHoveredConv(null)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span style={styles.convTitle}>{conv.title}</span>
            <div style={{
              ...styles.convActions,
              opacity: hoveredConv === conv.id ? 1 : 0,
            }}>
              <button
                style={styles.deleteBtn}
                onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                title="Delete conversation"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        ))}
        {conversations.length === 0 && (
          <div style={styles.emptyList}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No conversations yet</span>
          </div>
        )}
      </div>

      {/* Nav Buttons */}
      <div style={styles.navGroup}>
        {navItems.map((item) => (
          <button
            key={item.view}
            style={styles.navBtn(view === item.view)}
            onClick={() => setView(view === item.view ? 'chat' : item.view as any)}
            className="click-scale"
          >
            <svg width="14" height="14" viewBox={item.iconViewBox} fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              {item.iconPath}
            </svg>
            <span style={{ flex: 1, textAlign: 'left' }}>
              {view === item.view ? 'Chat' : item.label}
            </span>
            {view === item.view && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </button>
        ))}
      </div>

      {/* Footer Status */}
      <div style={styles.footer}>
        <div style={styles.statusDot(agentState)} />
        <span style={styles.statusText}>{agentState}</span>
        <div style={styles.modelBadge}>Flash</div>
      </div>
    </div>
  );
}

const navItems = [
  { view: 'player', label: 'Player', iconViewBox: '0 0 24 24', iconPath: <><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" /></> },
  { view: 'voice', label: 'Voice', iconViewBox: '0 0 24 24', iconPath: <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></> },
  { view: 'hotspots', label: 'Hot Topics', iconViewBox: '0 0 24 24', iconPath: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
  { view: 'weather', label: 'Weather', iconViewBox: '0 0 24 24', iconPath: <><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></> },
  { view: 'persona', label: 'Persona', iconViewBox: '0 0 24 24', iconPath: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></> },
  { view: 'social', label: 'Share', iconViewBox: '0 0 24 24', iconPath: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></> },
  { view: 'settings', label: 'Settings', iconViewBox: '0 0 24 24', iconPath: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></> },
  { view: 'memory', label: 'Memory', iconViewBox: '0 0 24 24', iconPath: <><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></> },
  { view: 'mcp', label: 'MCP', iconViewBox: '0 0 24 24', iconPath: <><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" /></> },
  { view: 'dashboard', label: 'Dashboard', iconViewBox: '0 0 24 24', iconPath: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></> },
];

const styles: Record<string, any> = {
  container: {
    width: 260,
    borderRight: '1px solid var(--border-default)',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-secondary)',
    flexShrink: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '16px 16px 12px',
    borderBottom: '1px solid var(--border-default)',
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: 'var(--gradient-brand)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    flexShrink: 0,
    boxShadow: 'var(--glow-primary)',
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.3px',
    flex: 1,
  },
  badge: {
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: 4,
    background: 'var(--accent-muted)',
    color: 'var(--accent-primary)',
    letterSpacing: '0.5px',
  },
  newChat: {
    margin: '10px 12px',
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'all var(--transition-fast)',
  },
  list: {
    flex: 1,
    overflow: 'auto',
    padding: '4px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  emptyList: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  convItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    color: 'var(--text-secondary)',
    transition: 'all var(--transition-fast)',
  },
  convItemActive: {
    background: 'var(--accent-subtle)',
    color: 'var(--text-primary)',
    borderLeft: '2px solid var(--accent-primary)',
  },
  convTitle: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 12.5,
  },
  convActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    transition: 'opacity 150ms ease',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 3,
    display: 'flex',
    alignItems: 'center',
    borderRadius: 4,
    transition: 'all 100ms ease',
  },
  navGroup: {
    padding: '4px 12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  navBtn: (active: boolean) => ({
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 600,
    color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
    background: active ? 'var(--accent-muted)' : 'transparent',
    border: active ? '1px solid var(--border-accent)' : '1px solid transparent',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'all var(--transition-fast)',
  }),
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    borderTop: '1px solid var(--border-default)',
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  statusDot: (state: string) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background:
      state === 'thinking' ? 'var(--warning)' :
      state === 'error' ? 'var(--error)' :
      state === 'speaking' ? 'var(--success)' :
      'var(--text-muted)',
    animation: state === 'thinking' ? 'pulse 1.5s ease-in-out infinite' : 'none',
  }),
  statusText: {
    flex: 1,
    textTransform: 'capitalize' as const,
    fontSize: 11.5,
  },
  modelBadge: {
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: 4,
    background: 'var(--bg-tertiary)',
    color: 'var(--success)',
    border: '1px solid rgba(63, 185, 80, 0.3)',
  },
};
