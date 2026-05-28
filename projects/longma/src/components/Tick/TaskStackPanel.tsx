import { useState, useEffect } from 'react';

interface SuspendedTask {
  id: string;
  description: string;
  progress: number;
  created_at: number;
  context: string | null;
}

export default function TaskStackPanel() {
  const [tasks, setTasks] = useState<SuspendedTask[]>([]);

  const loadTasks = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<SuspendedTask[]>('list_suspended_tasks');
      setTasks(result);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadTasks(); }, []);

  const handleResume = async (id: string) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('resume_task', { id });
      loadTasks();
    } catch { /* ignore */ }
  };

  const handleCancel = async (id: string) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('cancel_task', { id });
      loadTasks();
    } catch { /* ignore */ }
  };

  if (tasks.length === 0) return null;

  return (
    <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>
        挂起任务 ({tasks.length})
      </div>
      {tasks.map(t => (
        <div key={t.id} style={{
          padding: '6px 8px', marginBottom: 4,
          borderRadius: 4, background: 'var(--bg-tertiary)',
          fontSize: 11,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-primary)' }}>{t.description}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => handleResume(t.id)}
                style={btnStyle}>恢复</button>
              <button onClick={() => handleCancel(t.id)}
                style={{ ...btnStyle, color: '#e74c3c' }}>取消</button>
            </div>
          </div>
          <div style={{ marginTop: 3 }}>
            <div style={{
              height: 3, borderRadius: 2, background: 'var(--border)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${t.progress * 100}%`,
                background: 'var(--accent)', borderRadius: 2,
                transition: 'width 0.3s',
              }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '2px 6px', borderRadius: 3, border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--accent)', cursor: 'pointer',
  fontSize: 10,
};
