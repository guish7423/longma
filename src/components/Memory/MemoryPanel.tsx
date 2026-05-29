import { useState, useEffect, useCallback } from 'react';

interface MemoryItem {
  id?: number;
  category: string;
  content: string;
  tags: string[];
  strength: number;
  created_at: number;
  source: string;
}

const CATEGORIES = [
  'experience', 'capability', 'tool', 'knowledge',
  'user_profile', 'persona', 'system_prompt'
];

const CATEGORY_LABELS: Record<string, string> = {
  experience: '经验', capability: '能力', tool: '工具',
  knowledge: '知识', user_profile: '用户画像', persona: '人格',
  system_prompt: '系统提示'
};

export default function MemoryPanel() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadMemories = useCallback(async () => {
    setLoading(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<MemoryItem[]>('list_memories', {
        category: category || null,
      });
      setMemories(result);
    } catch (e) {
      console.error('Failed to load memories:', e);
    }
    setLoading(false);
  }, [category]);

  useEffect(() => { loadMemories(); }, [loadMemories]);

  const handleDelete = async (id: number) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('delete_memory', { id });
      loadMemories();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const filtered = search
    ? memories.filter(m =>
        m.content.toLowerCase().includes(search.toLowerCase()) ||
        m.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
      )
    : memories;

  return (
    <div style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--accent-primary)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: 6 }}>
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          Memory
        </h3>
      </div>

      <div style={{ position: 'relative', marginBottom: 8 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
          style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索记忆..."
          style={{
            width: '100%',
            padding: '7px 10px 7px 28px',
            borderRadius: 8, border: '1px solid var(--border-default)',
            background: 'var(--glass-bg)', color: 'var(--text-primary)',
            fontSize: 12, outline: 'none', boxSizing: 'border-box',
            backdropFilter: 'blur(8px)',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
        <button onClick={() => setCategory('')}
          style={chipStyle(category === '')}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            style={chipStyle(category === c)}>
            {CATEGORY_LABELS[c] || c}
          </button>
        ))}
      </div>

      <div className="mini-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--border-default)', borderTopColor: 'var(--accent-primary)', animation: 'spin 0.6s linear infinite' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Loading...</span>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', marginTop: 20, padding: 20 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: 8 }}>
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <div>No memories yet</div>
          </div>
        )}
        {filtered.map(m => (
          <div key={m.id} className="glass-card" style={{
            padding: '10px 12px',
            fontSize: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{
                padding: '1px 6px', borderRadius: 4,
                background: categoryColor(m.category),
                color: '#fff', fontSize: 10, fontWeight: 600,
              }}>
                {CATEGORY_LABELS[m.category] || m.category}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                  {(m.strength * 100).toFixed(0)}%
                </span>
                {m.id && (
                  <button onClick={() => handleDelete(m.id!)}
                    className="click-scale"
                    style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 10, padding: 1, opacity: 0.6 }}>
                    ✕
                  </button>
                )}
              </div>
            </div>
            <div style={{ color: 'var(--text-primary)', lineHeight: 1.5, fontSize: 11.5 }}>
              {m.content.length > 140 ? m.content.slice(0, 140) + '...' : m.content}
            </div>
            {m.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                {m.tags.map(t => (
                  <span key={t} style={{
                    padding: '1px 5px', borderRadius: 3,
                    background: 'var(--accent-subtle)', color: 'var(--accent-primary)',
                    fontSize: 10,
                  }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function categoryColor(category: string): string {
  const colors: Record<string, string> = {
    experience: '#3fb950',
    capability: '#58a6ff',
    tool: '#d29922',
    knowledge: '#a78bfa',
    user_profile: '#f0883e',
    persona: '#f85149',
    system_prompt: '#4f6fff',
  };
  return colors[category] || 'var(--text-muted)';
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '3px 8px', borderRadius: 4, border: 'none',
    cursor: 'pointer', fontSize: 11,
    background: active ? 'var(--accent)' : 'var(--bg-tertiary)',
    color: active ? '#fff' : 'var(--text-secondary)',
  };
}
