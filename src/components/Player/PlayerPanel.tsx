import { useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, message } from '@tauri-apps/plugin-dialog';
import { useSessionStore } from '../../stores/session';
import GlassPanel from '../../design-system/GlassPanel';

export default function PlayerPanel() {
  const { nowPlaying, setNowPlaying, volume, setVolume } = useSessionStore();
  const [tab, setTab] = useState<'music' | 'video'>('music');
  const [filePath, setFilePath] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // File picker for music
  const pickMusicFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'] }],
      });
      if (selected && typeof selected === 'string') {
        setFilePath(selected);
        // Auto-play after selection
        await playMusic(selected);
      }
    } catch (e: any) {
      setError(`File picker error: ${e}`);
    }
  }, []);

  // File picker for video
  const pickVideoFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Video', extensions: ['mp4', 'webm', 'mkv', 'avi', 'mov', 'wmv'] }],
      });
      if (selected && typeof selected === 'string') {
        setFilePath(selected);
        // For video, we use HTML5 video element which needs the file accessible
        // Tauri asset protocol or convert to blob URL
        setVideoSrc(`tauri://localhost/${encodeURIComponent(selected)}`);
        setTimeout(() => videoRef.current?.load(), 100);
      }
    } catch (e: any) {
      setError(`File picker error: ${e}`);
    }
  }, []);

  const playMusic = async (path?: string) => {
    const targetPath = path || filePath;
    if (!targetPath) {
      pickMusicFile();
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await invoke('player_play', { path: targetPath });
      const filename = targetPath.split(/[/\\]/).pop() || 'Unknown';
      setNowPlaying({ title: filename, artist: 'Local File', isPlaying: true });
    } catch (e: any) {
      setError(`Playback error: ${e}`);
      // Try file dialog if file doesn't exist
      if (String(e).includes('file not found') || String(e).includes('No such file')) {
        await message('The file could not be found. Please select a valid audio file.', { title: 'File Not Found', kind: 'error' });
        pickMusicFile();
      }
    }
    setIsLoading(false);
  };

  const handlePause = async () => {
    try { await invoke('player_pause'); setNowPlaying(nowPlaying ? { ...nowPlaying, isPlaying: false } : null); } catch {}
  };

  const handleResume = async () => {
    try { await invoke('player_resume'); setNowPlaying(nowPlaying ? { ...nowPlaying, isPlaying: true } : null); } catch {}
  };

  const handleStop = async () => {
    try { await invoke('player_stop'); setNowPlaying(null); } catch {}
  };

  const handleVolume = async (v: number) => {
    try { await invoke('player_set_volume', { volume: v }); setVolume(v); } catch {}
  };

  return (
    <div style={styles.container}>
      <div style={styles.tabs}>
        <button style={{ ...styles.tab, ...(tab === 'music' ? styles.tabActive : {}) }} onClick={() => setTab('music')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
          Music
        </button>
        <button style={{ ...styles.tab, ...(tab === 'video' ? styles.tabActive : {}) }} onClick={() => setTab('video')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
          Video
        </button>
      </div>

      {tab === 'music' ? (
        <GlassPanel variant="elevated" style={styles.panel}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.heading}>Music Player</h3>
            <button style={styles.openBtn} onClick={pickMusicFile}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Open File
            </button>
          </div>

          {/* File path display */}
          {filePath && (
            <div style={styles.filePath}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all' }}>{filePath}</span>
            </div>
          )}

          {/* Now Playing */}
          <GlassPanel variant="default" style={styles.nowPlaying}>
            {nowPlaying ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ ...styles.playingAnim, animation: nowPlaying.isPlaying ? 'spin 2s linear infinite' : 'none' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent-primary)" stroke="none"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>
                    </div>
                    <div>
                      <div style={styles.npTitle}>{nowPlaying.title}</div>
                      <div style={styles.npArtist}>{nowPlaying.artist}</div>
                    </div>
                  </div>
                </div>
                <div style={{ ...styles.statusDot, background: nowPlaying.isPlaying ? 'var(--success)' : 'var(--warning)' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                  <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                </svg>
                <div>
                  <div style={styles.npEmpty}>No track loaded</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Click "Open File" to play music</div>
                </div>
              </div>
            )}
          </GlassPanel>

          {/* Controls */}
          <div style={styles.controls}>
            <button style={styles.ctrlBtn} onClick={() => playMusic()} disabled={isLoading} title="Play">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-primary)" stroke="none"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            </button>
            <button style={styles.ctrlBtn} onClick={handlePause} title="Pause">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-primary)" stroke="none"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
            </button>
            <button style={styles.ctrlBtn} onClick={handleResume} title="Resume">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-primary)" stroke="none"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            </button>
            <button style={styles.ctrlBtn} onClick={handleStop} title="Stop">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-primary)" stroke="none"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
            </button>
          </div>

          {/* Volume */}
          <div style={styles.volumeRow}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => handleVolume(parseFloat(e.target.value))} style={styles.slider} />
            <span style={styles.volLabel}>{Math.round(volume * 100)}%</span>
          </div>

          {/* Error display */}
          {error && (
            <div style={styles.errorBox}>
              <span style={{ fontSize: 12, color: 'var(--error)' }}>{error}</span>
              <button style={styles.dismissBtn} onClick={() => setError(null)}>×</button>
            </div>
          )}
        </GlassPanel>
      ) : (
        <GlassPanel variant="elevated" style={styles.panel}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.heading}>Video Player</h3>
            <button style={styles.openBtn} onClick={pickVideoFile}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Open Video
            </button>
          </div>

          <div style={styles.videoContainer}>
            {videoSrc ? (
              <video ref={videoRef} src={videoSrc} controls style={styles.video} />
            ) : (
              <div style={styles.videoPlaceholder}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                  <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                <span style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 13 }}>Click "Open Video" to play a file</span>
                <span style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 11 }}>Supports MP4, WebM, MKV, AVI, MOV</span>
              </div>
            )}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}

const styles: Record<string, any> = {
  container: { flex: 1, padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, margin: '0 auto', width: '100%' },
  tabs: { display: 'flex', gap: 4, background: 'var(--bg-tertiary)', borderRadius: 10, padding: 3 },
  tab: { flex: 1, padding: '8px 16px', border: 'none', background: 'transparent', color: 'var(--text-muted)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 150ms ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabActive: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' },
  panel: { padding: 24, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 16 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 },
  openBtn: { padding: '7px 14px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 150ms ease' },
  filePath: { padding: '6px 10px', background: 'var(--bg-tertiary)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 },
  nowPlaying: { padding: 16, borderRadius: 8, display: 'flex', alignItems: 'center', minHeight: 56 },
  npTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' },
  npArtist: { fontSize: 12, color: 'var(--text-muted)' },
  npEmpty: { fontSize: 13, color: 'var(--text-muted)' },
  statusDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  playingAnim: { width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  controls: { display: 'flex', justifyContent: 'center', gap: 12 },
  ctrlBtn: { width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border-default)', background: 'var(--bg-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms ease', opacity: 1 },
  volumeRow: { display: 'flex', alignItems: 'center', gap: 10 },
  slider: { flex: 1, height: 4, accentColor: 'var(--accent-primary)' },
  volLabel: { fontSize: 12, color: 'var(--text-muted)', width: 36, textAlign: 'right' },
  errorBox: { padding: '8px 12px', background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.2)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  dismissBtn: { background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 16, padding: '0 4px' },
  videoContainer: { width: '100%', aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden', background: '#000' },
  video: { width: '100%', height: '100%' },
  videoPlaceholder: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300 },
};
