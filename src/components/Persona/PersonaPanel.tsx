import { useState, useEffect } from 'react';
import GlassPanel from '../../design-system/GlassPanel';

interface Persona {
  id: string;
  name: string;
  title: string;
  description: string;
  systemPrompt: string;
  icon: string;
  color: string;
}

const DEFAULT_PERSONAS: Persona[] = [
  {
    id: 'assistant',
    name: 'Assistant',
    title: 'General Assistant',
    description: 'Helpful, balanced AI assistant for everyday tasks',
    systemPrompt: 'You are LongMa, a helpful AI assistant. Be concise, accurate, and friendly.',
    icon: '🤖',
    color: '#4f6fff',
  },
  {
    id: 'coder',
    name: 'Coder',
    title: 'Programming Expert',
    description: 'Expert programmer skilled in Rust, TypeScript, Python, and system design',
    systemPrompt: 'You are a senior software engineer. Write clean, idiomatic code. Explain your reasoning.',
    icon: '💻',
    color: '#2da44e',
  },
  {
    id: 'writer',
    name: 'Writer',
    title: 'Creative Writer',
    description: 'Creative writer for articles, stories, and polished content',
    systemPrompt: 'You are a professional writer. Craft engaging, well-structured content with vivid language.',
    icon: '✍️',
    color: '#d4a574',
  },
  {
    id: 'scholar',
    name: 'Scholar',
    title: 'Deep Researcher',
    description: 'Thorough researcher for in-depth analysis and learning',
    systemPrompt: 'You are a meticulous researcher. Provide thorough, evidence-based analysis with citations.',
    icon: '🎓',
    color: '#ffa500',
  },
];

export default function PersonaPanel() {
  const [personas] = useState<Persona[]>(DEFAULT_PERSONAS);
  const [activePersona, setActivePersona] = useState('assistant');
  const [customPrompt, setCustomPrompt] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [savedPersonas, setSavedPersonas] = useState<string[]>([]);

  // Load saved personae from memory system
  useEffect(() => {
    (async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const memories = await invoke<any[]>('search_memory', {
          query: 'persona',
          category: 'preference',
          limit: 10,
        });
        const saved: string[] = [];
        for (const m of memories) {
          if (m.tags?.includes('persona') && m.content) {
            saved.push(m.content);
          }
        }
        setSavedPersonas(saved);
      } catch { /* memory not ready */ }
    })();
  }, []);

  // Load saved persona preference
  useEffect(() => {
    (async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const memories = await invoke<any[]>('search_memory', {
          query: 'active_persona',
          category: 'preference',
          limit: 5,
        });
        if (memories.length > 0 && memories[0].content) {
          const saved = memories[0].content.trim().toLowerCase();
          if (personas.find(p => p.id === saved)) {
            setActivePersona(saved);
          }
        }
      } catch { /* memory not ready */ }
    })();
  }, []);

  const selectPersona = async (id: string) => {
    setActivePersona(id);
    setStatusMsg(null);

    // Save to memory system
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const persona = personas.find(p => p.id === id);
      if (!persona) return;

      // Save active persona selection
      await invoke('write_memory', {
        category: 'preference',
        content: id,
        tags: ['persona', `persona:${id}`],
        source: 'persona-panel',
      });

      // Save persona system prompt
      await invoke('write_memory', {
        category: 'persona',
        content: persona.systemPrompt,
        tags: ['persona', `persona:${id}`, 'system_prompt'],
        source: 'persona-panel',
      });

      // Reload saved personas list
      const memories = await invoke<any[]>('search_memory', {
        query: 'persona',
        category: 'preference',
        limit: 10,
      });
      const saved: string[] = [];
      for (const m of memories) {
        if (m.tags?.includes('persona') && m.content) {
          saved.push(m.content);
        }
      }
      setSavedPersonas(saved);

      setStatusMsg(`✅ "${persona.name}" persona saved to memory`);
      setTimeout(() => setStatusMsg(null), 2000);
    } catch (e: any) {
      setStatusMsg(`⚠️ Selected locally (memory save: ${e.message})`);
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const handleSaveCustomPrompt = async () => {
    if (!customPrompt.trim()) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const persona = personas.find(p => p.id === activePersona);
      if (!persona) return;

      await invoke('write_memory', {
        category: 'persona',
        content: customPrompt.trim(),
        tags: ['persona', `persona:${activePersona}`, 'custom_prompt'],
        source: 'persona-panel',
      });

      setStatusMsg('✅ Custom prompt saved to memory');
      setTimeout(() => setStatusMsg(null), 2000);
    } catch (e: any) {
      setStatusMsg(`❌ Failed: ${e.message}`);
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          Persona
        </h2>
        <span style={styles.subtitle}>Choose your AI's personality</span>
        {savedPersonas.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            (saved: {savedPersonas.join(', ')})
          </span>
        )}
      </div>

      {statusMsg && (
        <div style={{
          padding: '8px 14px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          marginBottom: 12,
          background: statusMsg.startsWith('✅') ? 'rgba(63, 185, 80, 0.1)' : 'rgba(248, 81, 73, 0.1)',
          color: statusMsg.startsWith('✅') ? '#3fb950' : '#f85149',
        }}>
          {statusMsg}
        </div>
      )}

      {/* Persona Cards */}
      <div style={styles.grid}>
        {personas.map(p => {
          const isActive = activePersona === p.id;
          return (
            <button
              key={p.id}
              style={{
                ...styles.personaCard,
                ...(isActive ? { ...styles.personaCardActive, borderColor: p.color } : {}),
              }}
              onClick={() => selectPersona(p.id)}
            >
              <div style={{ ...styles.personaIcon, background: `${p.color}18` }}>
                <span style={{ fontSize: 24 }}>{p.icon}</span>
              </div>
              <div style={styles.personaName}>{p.name}</div>
              <div style={styles.personaTitle}>{p.title}</div>
              <div style={styles.personaDesc}>{p.description}</div>
              {isActive && <div style={{ ...styles.activeIndicator, background: p.color }}>Active</div>}
            </button>
          );
        })}
      </div>

      {/* System Prompt Preview */}
      <GlassPanel variant="elevated" style={styles.panel}>
        <h3 style={styles.sectionTitle}>
          System Prompt
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
            ({personas.find(p => p.id === activePersona)?.name})
          </span>
        </h3>
        <div style={styles.promptBox}>
          {personas.find(p => p.id === activePersona)?.systemPrompt}
        </div>

        <h3 style={{ ...styles.sectionTitle, marginTop: 16 }}>Custom Override</h3>
        <textarea
          style={styles.customInput}
          placeholder="Write a custom system prompt for this persona... (saved to memory)"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          rows={3}
        />
        <button style={styles.saveBtn} onClick={handleSaveCustomPrompt}>
          Save to Memory
        </button>
      </GlassPanel>

      {/* Saved Personas from Memory */}
      {savedPersonas.filter(p => p !== activePersona).length > 0 && (
        <GlassPanel variant="default" style={styles.panel}>
          <h3 style={styles.sectionTitle}>Previously Used</h3>
          <div style={styles.savedRow}>
            {savedPersonas.filter(p => p !== activePersona).map(p => (
              <button
                key={p}
                style={styles.savedChip}
                onClick={() => selectPersona(p)}
              >
                {personas.find(pp => pp.id === p)?.icon || '📋'} {p}
              </button>
            ))}
          </div>
        </GlassPanel>
      )}

      {/* Memory Note */}
      <GlassPanel variant="default" style={styles.panel}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Memory-Connected</strong>
          <br />
          Persona selections are persisted to LongMa's memory system.
          The persona you select will influence the agent's behavior.
        </div>
      </GlassPanel>
    </div>
  );
}

const styles: Record<string, any> = {
  container: { flex: 1, padding: 24, overflow: 'auto', maxWidth: 800, margin: '0 auto', width: '100%' },
  header: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  title: { fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 },
  subtitle: { fontSize: 13, color: 'var(--text-muted)' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 },
  personaCard: { padding: 20, borderRadius: 12, background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', cursor: 'pointer', textAlign: 'center', transition: 'all 150ms ease' },
  personaCardActive: { background: 'var(--glass-bg)', borderWidth: 1.5, backdropFilter: 'blur(8px)' },
  personaIcon: { width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' },
  personaName: { fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 },
  personaTitle: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 },
  personaDesc: { fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 8 },
  activeIndicator: { display: 'inline-block', padding: '2px 10px', borderRadius: 10, color: '#fff', fontSize: 10, fontWeight: 600 },
  panel: { marginBottom: 16, padding: 20, borderRadius: 12 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center' },
  promptBox: { padding: 14, borderRadius: 8, background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, fontFamily: 'monospace' },
  customInput: { width: '100%', padding: 12, fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10 },
  saveBtn: { padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--accent-primary)', border: 'none', borderRadius: 8, cursor: 'pointer' },
  savedRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  savedChip: { padding: '6px 12px', borderRadius: 20, background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 },
};
