import { useState, useRef, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import GlassPanel from '../../design-system/GlassPanel';

type TtsMode = 'web' | 'system' | 'unavailable';

export default function VoicePanel() {
  const [ttsText, setTtsText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [ttsMode, setTtsMode] = useState<TtsMode>('web');
  const [systemTtsAvailable, setSystemTtsAvailable] = useState(false);
  const [usingSystemTts, setUsingSystemTts] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const recognitionRef = useRef<any>(null);
  const [asrSupported, setAsrSupported] = useState(true);

  // Detect TTS / ASR capabilities on mount
  useEffect(() => {
    // Check Web Speech TTS
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setTtsMode('web');
    } else {
      setTtsMode('unavailable');
    }

    // Check Web Speech ASR
    const hasSpeechRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    setAsrSupported(hasSpeechRecognition);

    // Check Rust system TTS
    invoke<any>('detect_tts').then((cap: any) => {
      setSystemTtsAvailable(cap.available);
      if (cap.available && ttsMode === 'unavailable') {
        setTtsMode('system');
      }
    }).catch(() => {});

    return () => {
      synthRef.current?.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

  // ── Web Speech TTS ──
  const speakWeb = useCallback((text: string) => {
    if (!synthRef.current) return false;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    const voices = synthRef.current.getVoices();
    const zhVoice = voices.find(v => v.lang.startsWith('zh'));
    if (zhVoice && /[\u4e00-\u9fff]/.test(text)) utterance.voice = zhVoice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
    return true;
  }, []);

  // ── System TTS (Rust) ──
  const speakSystem = useCallback(async (text: string) => {
    try {
      setIsSpeaking(true);
      setUsingSystemTts(true);
      await invoke('speak_text', { text, engine: null });
      setIsSpeaking(false);
      setUsingSystemTts(false);
    } catch (e) {
      setIsSpeaking(false);
      setUsingSystemTts(false);
      console.error('System TTS error:', e);
    }
  }, []);

  const handleSpeak = useCallback(() => {
    if (!ttsText.trim()) return;
    if (ttsMode === 'web') {
      if (!speakWeb(ttsText)) {
        speakSystem(ttsText);
      }
    } else if (systemTtsAvailable) {
      speakSystem(ttsText);
    }
  }, [ttsText, ttsMode, systemTtsAvailable, speakWeb, speakSystem]);

  const handleStopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
    setUsingSystemTts(false);
  }, []);

  // ── ASR ──
  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscript('⚠️ Speech recognition requires HTTPS. In Tauri desktop app, use Chrome/Edge browser version instead.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';

    recognition.onresult = (event: any) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      setTranscript(final || interim);
    };
    recognition.onerror = (e: any) => {
      console.error('ASR error:', e);
      setIsListening(false);
      if (e.error === 'not-allowed') {
        setTranscript('⚠️ Microphone access denied. Please allow microphone permissions.');
      } else if (e.error === 'aborted') {
        setTranscript('');
      }
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  return (
    <div style={styles.container}>
      {/* TTS Section */}
      <GlassPanel variant="elevated" style={styles.panel}>
        <h3 style={styles.heading}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
          Text-to-Speech
          {ttsMode === 'system' && <span style={styles.badge}>System</span>}
          {usingSystemTts && <span style={styles.badge}>🔊 System Voice</span>}
        </h3>

        <textarea
          style={styles.textarea}
          placeholder={ttsMode === 'unavailable' && !systemTtsAvailable
            ? 'No TTS engine available. Install espeak (Linux) or use a browser.'
            : 'Type text to speak aloud...'}
          value={ttsText}
          onChange={(e) => setTtsText(e.target.value)}
          rows={4}
          disabled={ttsMode === 'unavailable' && !systemTtsAvailable}
        />

        <div style={styles.btnRow}>
          <button
            style={{
              ...styles.primaryBtn,
              opacity: ttsText.trim() ? 1 : 0.5,
              cursor: ttsText.trim() ? 'pointer' : 'not-allowed',
            }}
            onClick={handleSpeak}
            disabled={!ttsText.trim() || (ttsMode === 'unavailable' && !systemTtsAvailable)}
          >
            {isSpeaking ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={styles.speakingDot} /> Speaking...
              </span>
            ) : '🔊 Speak'}
          </button>
          {isSpeaking && (
            <button style={styles.secondaryBtn} onClick={handleStopSpeaking}>
              ⏹ Stop
            </button>
          )}
        </div>

        {ttsMode === 'unavailable' && !systemTtsAvailable && (
          <GlassPanel variant="default" style={styles.warningBox}>
            <span style={{ fontSize: 12, color: 'var(--warning)' }}>
              ⚠️ No TTS engine detected. Install espeak: <code style={{ color: 'var(--text-primary)' }}>sudo apt install espeak</code> (Linux)
            </span>
          </GlassPanel>
        )}
      </GlassPanel>

      {/* ASR Section */}
      <GlassPanel variant="elevated" style={styles.panel}>
        <h3 style={styles.heading}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          Speech-to-Text
          {!asrSupported && <span style={{ ...styles.badge, background: 'var(--accent-danger)', color: '#fff' }}>Unavailable</span>}
        </h3>

        <div style={styles.micRow}>
          <button
            style={{
              ...styles.micBtn,
              background: isListening ? 'var(--error)' : asrSupported ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              cursor: asrSupported ? 'pointer' : 'not-allowed',
            }}
            onClick={toggleListening}
            disabled={!asrSupported}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
            {isListening ? 'Stop' : 'Start'} Recording
          </button>
          <span style={{ fontSize: 12, color: isListening ? 'var(--success)' : 'var(--text-muted)' }}>
            {isListening ? '● Listening...' : asrSupported ? 'Click to start' : 'Not available'}
          </span>
        </div>

        <GlassPanel variant="default" style={styles.transcriptBox}>
          {transcript ? (
            <span>{transcript}</span>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {asrSupported
                ? 'Speech transcript will appear here...'
                : 'Speech recognition requires HTTPS context. Use Chrome/Edge browser version, or paste text manually.'}
            </span>
          )}
        </GlassPanel>

        {!asrSupported && (
          <GlassPanel variant="default" style={styles.warningBox}>
            <span style={{ fontSize: 12, color: 'var(--warning)' }}>
              💡 Tauri desktop app uses <code>tauri://</code> protocol which doesn't support the Web Speech Recognition API.
              For voice input, use the TTS text-to-speech output above.
            </span>
          </GlassPanel>
        )}
      </GlassPanel>

      {/* Tips */}
      <GlassPanel variant="default" style={styles.tipBox}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          🔊 <strong>TTS</strong>: Web Speech (built-in) for most voices. 
          System TTS fallback via {navigator.platform.includes('Win') ? 'PowerShell' : navigator.platform.includes('Mac') ? 'say command' : 'espeak'}.
          <br />
          🎤 <strong>ASR</strong>: Speech recognition limited in desktop apps. 
          For full voice input, access LongMa via a browser.
        </span>
      </GlassPanel>
    </div>
  );
}

const styles: Record<string, any> = {
  container: { flex: 1, padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, margin: '0 auto', width: '100%' },
  panel: { padding: 24, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 },
  heading: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 },
  badge: { fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'var(--accent-muted)', color: 'var(--accent-primary)' },
  textarea: { width: '100%', padding: 12, background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 },
  btnRow: { display: 'flex', gap: 8 },
  primaryBtn: { padding: '10px 24px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  secondaryBtn: { padding: '10px 24px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  speakingDot: { width: 8, height: 8, borderRadius: '50%', background: '#3fb950', animation: 'pulse 1s ease-in-out infinite' },
  micRow: { display: 'flex', alignItems: 'center', gap: 12 },
  micBtn: { padding: '10px 20px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, color: '#fff' },
  transcriptBox: { padding: 16, borderRadius: 8, minHeight: 60, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 },
  warningBox: { padding: 10, borderRadius: 8, background: 'rgba(210, 153, 34, 0.08)', border: '1px solid rgba(210, 153, 34, 0.2)' },
  tipBox: { padding: 12, borderRadius: 8 },
};
