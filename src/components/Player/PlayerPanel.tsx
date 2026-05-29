import { useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSessionStore } from '../../stores/session';
import GlassPanel from '../../design-system/GlassPanel';

export default function PlayerPanel() {
  const { nowPlaying, setNowPlaying, volume, setVolume } = useSessionStore();
  const [tab, setTab] = useState<'music' | 'video'>('music');
  const [filePath, setFilePath] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState('');

  const handlePlayMusic = async () => {
    try {
      await invoke('player_play', { path: filePath || '/home/guish/Music/sample.mp3' });
      setNowPlaying({ title: filePath.split('/').pop() || 'Unknown', artist: 'Local File', isPlaying: true });
    } catch (e) {
      console.error('Play error:', e);
    }
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
    try { await invoke('set_volume', { volume: v }); setVolume(v); } catch {}
  };

  const handleVideoFile = async () => {
    try {
      const path = filePath || '/home/guish/Videos/sample.mp4';
      setVideoSrc(`tauri://localhost/${encodeURIComponent(path)}`); // works if file served via asset protocol
      if (videoRef.current) videoRef.current.load();
    } catch {}
  };

  return (
    <div style={styles.container}>
      <div style={styles.tabs}>
        <button style={{ ...styles.tab, ...(tab === 'music' ? styles.tabActive : {}) }} onClick={() => setTab('music')}>Music</button>
        <button style={{ ...styles.tab, ...(tab === 'video' ? styles.tabActive : {}) }} onClick={() => setTab('video')}>Video</button>
      </div>

      {tab === 'music' ? (
        <GlassPanel variant="elevated" style={styles.panel}>
          <h3 style={styles.heading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
            Music Player
          </h3>

          <div style={styles.inputRow}>
            <input
              style={styles.fileInput}
              placeholder="Music file path (e.g. /home/user/music/song.mp3)"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
            />
          </div>

          {/* Now Playing */}
          <GlassPanel variant="default" style={styles.nowPlaying}>
            {nowPlaying ? (
              <>
                <div style={styles.npInfo}>
                  <div style={styles.npTitle}>{nowPlaying.title}</div>
                  <div style={styles.npArtist}>{nowPlaying.artist}</div>
                </div>
                <div style={{ ...styles.statusDot, background: nowPlaying.isPlaying ? 'var(--success)' : 'var(--warning)' }} />
              </>
            ) : (
              <div style={styles.npEmpty}>No track loaded</div>
            )}
          </GlassPanel>

          {/* Controls */}
          <div style={styles.controls}>
            <button style={styles.ctrlBtn} onClick={handlePlayMusic} title="Play"><svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-primary)" stroke="none"><polygon points="5 3 19 12 5 21 5 3" /></svg></button>
            <button style={styles.ctrlBtn} onClick={handlePause} title="Pause"><svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-primary)" stroke="none"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg></button>
            <button style={styles.ctrlBtn} onClick={handleResume} title="Resume"><svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-primary)" stroke="none"><polygon points="5 3 19 12 5 21 5 3" /></svg></button>
            <button style={styles.ctrlBtn} onClick={handleStop} title="Stop"><svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-primary)" stroke="none"><rect x="6" y="6" width="12" height="12" rx="1" /></svg></button>
          </div>

          {/* Volume */}
          <div style={styles.volumeRow}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => handleVolume(parseFloat(e.target.value))} style={styles.slider} />
            <span style={styles.volLabel}>{Math.round(volume * 100)}%</span>
          </div>
        </GlassPanel>
      ) : (
        <GlassPanel variant="elevated" style={styles.panel}>
          <h3 style={styles.heading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            Video Player
          </h3>
          <div style={styles.inputRow}>
            <input style={styles.fileInput} placeholder="Video file path" value={filePath} onChange={(e) => setFilePath(e.target.value)} />
            <button style={styles.loadBtn} onClick={handleVideoFile}>Load</button>
          </div>
          <div style={styles.videoContainer}>
            {videoSrc ? (
              <video ref={videoRef} src={videoSrc} controls style={styles.video} />
            ) : (
              <div style={styles.videoPlaceholder}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                  <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                <span style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 13 }}>Load a video file to play</span>
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
  tab: { flex: 1, padding: '8px 16px', border: 'none', background: 'transparent', color: 'var(--text-muted)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 150ms ease' },
  tabActive: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' },
  panel: { padding: 24, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 16 },
  heading: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 },
  inputRow: { display: 'flex', gap: 8 },
  fileInput: { flex: 1, padding: '10px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none' },
  loadBtn: { padding: '10px 20px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  nowPlaying: { padding: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  npInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  npTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' },
  npArtist: { fontSize: 12, color: 'var(--text-muted)' },
  npEmpty: { fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' },
  statusDot: { width: 8, height: 8, borderRadius: '50%' },
  controls: { display: 'flex', justifyContent: 'center', gap: 12 },
  ctrlBtn: { width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border-default)', background: 'var(--bg-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms ease' },
  volumeRow: { display: 'flex', alignItems: 'center', gap: 10 },
  slider: { flex: 1, height: 4, accentColor: 'var(--accent-primary)' },
  volLabel: { fontSize: 12, color: 'var(--text-muted)', width: 36, textAlign: 'right' },
  videoContainer: { width: '100%', aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden', background: '#000' },
  video: { width: '100%', height: '100%' },
  videoPlaceholder: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300 },
};
