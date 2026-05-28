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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logo}>LM</div>
        <span style={styles.title}>LongMa</span>
      </div>

      <button style={styles.newChat} onClick={onNew}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Chat
      </button>

      <div style={styles.list}>
        {conversations.map((conv) => (
          <div
            key={conv.id}
            style={{
              ...styles.convItem,
              ...(conv.id === currentConversationId ? styles.convItemActive : {}),
            }}
            onClick={() => onSelect(conv.id)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span style={styles.convTitle}>{conv.title}</span>
            <button
              style={styles.deleteBtn}
              onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
              title="Delete conversation"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Settings button */}
      <button style={styles.settingsBtn(view)} onClick={() => setView(view === 'settings' ? 'chat' : 'settings')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        {view === 'settings' ? 'Chat' : 'Settings'}
      </button>

      {/* Dashboard button */}
      <button style={styles.dashboardBtn(view)} onClick={() => setView(view === 'dashboard' ? 'chat' : 'dashboard')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        {view === 'dashboard' ? 'Chat' : 'Dashboard'}
      </button>

      <div style={styles.footer}>
        <div style={styles.statusDot(agentState)} />
        <span style={styles.statusText}>{agentState}</span>
      </div>
    </div>
  );
}

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
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, #7c3aed 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.3px',
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
    transition: 'all 0.15s ease',
  },
  list: {
    flex: 1,
    overflow: 'auto',
    padding: '4px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
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
    transition: 'all 0.15s ease',
  },
  convItemActive: {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
  },
  convTitle: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  deleteBtn: {
    opacity: 0,
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
    alignItems: 'center',
    borderRadius: 4,
  },
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
      state === 'thinking' ? 'var(--accent-warning)' :
      state === 'error' ? 'var(--accent-danger)' :
      state === 'speaking' ? 'var(--accent-success)' :
      'var(--text-muted)',
    animation: state === 'thinking' ? 'pulse 1.5s ease-in-out infinite' : 'none',
  }),
  statusText: {},
  dashboardBtn: (view: string) => ({
    margin: '0 12px 8px',
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 600,
    color: view === 'dashboard' ? 'var(--accent-primary)' : 'var(--text-secondary)',
    background: view === 'dashboard' ? 'rgba(79, 111, 255, 0.1)' : 'transparent',
    border: view === 'dashboard' ? '1px solid rgba(79, 111, 255, 0.25)' : '1px solid transparent',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'all 0.15s ease',
  }),
  settingsBtn: (view: string) => ({
    margin: '0 12px 8px',
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 600,
    color: view === 'settings' ? 'var(--accent-primary)' : 'var(--text-secondary)',
    background: view === 'settings' ? 'rgba(79, 111, 255, 0.1)' : 'transparent',
    border: view === 'settings' ? '1px solid rgba(79, 111, 255, 0.25)' : '1px solid transparent',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'all 0.15s ease',
  }),
};
