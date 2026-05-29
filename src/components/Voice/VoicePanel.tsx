import { useState, useRef, useCallback, useEffect } from 'react';
import GlassPanel from '../../design-system/GlassPanel';

export default function VoicePanel() {
  const [ttsText, setTtsText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const synthRef = useRef(window.speechSynthesis);
  const recognitionRef = useRef<any>(null);

  // TTS
  const handleSpeak = useCallback(() => {
    if (!ttsText.trim()) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(ttsText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    // Try to find a Chinese voice if text contains Chinese
    const voices = synthRef.current.getVoices();
    const zhVoice = voices.find(v => v.lang.startsWith('zh'));
    if (zhVoice && /[\u4e00-\u9fff]/.test(ttsText)) utterance.voice = zhVoice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  }, [ttsText]);

  const handleStopSpeaking = useCallback(() => {
    synthRef.current.cancel();
    setIsSpeaking(false);
  }, []);

  // ASR (Speech Recognition)
  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscript('Speech recognition not available in this browser. Try Chrome/Edge.');
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
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  useEffect(() => {
    // Pre-load voices
    synthRef.current.getVoices();
    return () => { synthRef.current.cancel(); recognitionRef.current?.stop(); };
  }, []);

  return (
    <div style={styles.container}>
      {/* TTS Section */}
      <GlassPanel variant="elevated" style={styles.panel}>
        <h3 style={styles.heading}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
          Text-to-Speech
        </h3>
        <textarea
          style={styles.textarea}
          placeholder="Type text to speak..."
          value={ttsText}
          onChange={(e) => setTtsText(e.target.value)}
          rows={4}
        />
        <div style={styles.btnRow}>
          <button style={{ ...styles.primaryBtn, opacity: ttsText.trim() ? 1 : 0.5 }} onClick={handleSpeak} disabled={!ttsText.trim()}>
            {isSpeaking ? 'Speaking...' : '🔊 Speak'}
          </button>
          {isSpeaking && <button style={styles.secondaryBtn} onClick={handleStopSpeaking}>⏹ Stop</button>}
        </div>
      </GlassPanel>

      {/* ASR Section */}
      <GlassPanel variant="elevated" style={styles.panel}>
        <h3 style={styles.heading}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          Speech-to-Text
        </h3>
        <div style={styles.micRow}>
          <button
            style={{ ...styles.micBtn, background: isListening ? 'var(--error)' : 'var(--accent-primary)' }}
            onClick={toggleListening}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
            {isListening ? 'Stop' : 'Start'} Recording
          </button>
          <span style={{ fontSize: 12, color: isListening ? 'var(--success)' : 'var(--text-muted)' }}>
            {isListening ? '● Listening...' : 'Click to start'}
          </span>
        </div>
        <GlassPanel variant="default" style={styles.transcriptBox}>
          {transcript || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Speech transcript will appear here...</span>}
        </GlassPanel>
      </GlassPanel>

      {/* Tips */}
      <GlassPanel variant="default" style={styles.tipBox}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          💡 TTS uses Web Speech API. ASR requires Chrome/Edge (SpeechRecognition API). 
          For best results, use a microphone and speak clearly.
        </span>
      </GlassPanel>
    </div>
  );
}

const styles: Record<string, any> = {
  container: { flex: 1, padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, margin: '0 auto', width: '100%' },
  panel: { padding: 24, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 },
  heading: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 },
  textarea: { width: '100%', padding: 12, background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 },
  btnRow: { display: 'flex', gap: 8 },
  primaryBtn: { padding: '10px 24px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  secondaryBtn: { padding: '10px 24px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  micRow: { display: 'flex', alignItems: 'center', gap: 12 },
  micBtn: { padding: '10px 20px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, color: '#fff' },
  transcriptBox: { padding: 16, borderRadius: 8, minHeight: 60, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 },
  tipBox: { padding: 12, borderRadius: 8 },
};
