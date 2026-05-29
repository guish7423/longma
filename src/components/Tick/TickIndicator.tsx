import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

interface TickHeartbeat {
  mode: 'idle' | 'active' | 'task';
  tick_count: number;
  uptime_secs: number;
  last_action: string;
}

const MODE_LABELS: Record<string, string> = {
  idle: '待机', active: '活跃', task: '任务',
};

export default function TickIndicator() {
  const [heartbeat, setHeartbeat] = useState<TickHeartbeat | null>(null);

  useEffect(() => {
    const unlisten = listen<TickHeartbeat>('tick-heartbeat', (event) => {
      setHeartbeat(event.payload);
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  if (!heartbeat) {
    return (
      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
        ⏳ 初始化...
      </span>
    );
  }

  const mode = heartbeat.mode;
  const pulseSpeed = mode === 'idle' ? '3s' : mode === 'active' ? '1s' : '0.3s';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: mode === 'idle' ? '#888' : mode === 'active' ? '#4f6fff' : '#2ecc71',
        animation: `pulse ${pulseSpeed} ease-in-out infinite`,
        display: 'inline-block',
      }} />
      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
        {MODE_LABELS[mode] || mode}
      </span>
    </div>
  );
}
