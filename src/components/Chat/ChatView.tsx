import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../stores/chat';
import { useSessionStore } from '../../stores/session';
import { useToast } from '../../design-system/Toast';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

export default function ChatView() {
  const { messages, isStreaming, streamingContent, streamingReasoning, sendMessage } = useChatStore();
  const { model, stats } = useSessionStore();
  const { showToast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [welcomeIndex, setWelcomeIndex] = useState(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  useEffect(() => {
    useSessionStore.getState().loadConfig();
  }, []);

  // Cycling welcome messages
  useEffect(() => {
    if (messages.length > 0) return;
    const interval = setInterval(() => {
      setWelcomeIndex(prev => (prev + 1) % welcomeTips.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [messages.length]);

  const totalSaved = stats.total_input_tokens > 0 && stats.total_cache_hit_tokens > 0
    ? ((stats.total_cache_hit_tokens / stats.total_input_tokens) * 100).toFixed(0)
    : null;

  return (
    <div style={styles.container}>
      {messages.length === 0 && !isStreaming ? (
        <div style={styles.empty}>
          {/* Gradient logo */}
          <div style={styles.logoRing}>
            <div style={styles.logo}>LM</div>
          </div>

          {/* Animated gradient title */}
          <h1 style={styles.emptyTitle}>
            <span style={styles.gradientText}>LongMa</span>
          </h1>
          <p style={styles.emptySub}>DeepSeek-native AI Agent · 龙马精神</p>

          {/* Stats mini */}
          {totalSaved && (
            <div style={styles.statsBadge}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              {totalSaved}% cache efficiency
            </div>
          )}

          {/* Keyboard shortcuts */}
          <div style={styles.shortcuts}>
            <span style={styles.shortcut}><kbd style={styles.kbd}>Enter</kbd> Send</span>
            <span style={styles.shortcutSep}>·</span>
            <span style={styles.shortcut}><kbd style={styles.kbd}>Shift</kbd> + <kbd style={styles.kbd}>Enter</kbd> New line</span>
          </div>

          {/* Cycling tip */}
          <div style={styles.tipRow}>
            <span style={styles.tipIcon}>💡</span>
            <span style={styles.tipText} key={welcomeIndex}>
              {welcomeTips[welcomeIndex]}
            </span>
          </div>

          {/* Suggestion buttons */}
          <div style={styles.suggestions}>
            {suggestions.map((s) => (
              <button
                key={s}
                style={styles.suggestionBtn}
                onClick={() => {
                  sendMessage(s);
                  showToast(`Sending: "${s}"`, 'info');
                }}
                className="hover-lift click-scale"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                {s}
              </button>
            ))}
          </div>

          {/* Model badge */}
          <div style={styles.poweredBy}>
            <span style={{ opacity: 0.5 }}>Powered by</span>
            <div style={styles.modelBadge}>
              <span style={styles.modelDot} />
              DeepSeek {model === 'deepseek-v4-pro' ? 'Pro' : 'Flash'}
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.messageList}>
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              style={{ animationDelay: `${i * 0.05}s` }}
            />
          ))}
          {isStreaming && (
            <MessageBubble
              message={{ role: 'assistant', content: streamingContent, reasoningContent: streamingReasoning || undefined }}
              isStreaming
              streamingContent={streamingContent}
              streamingReasoning={streamingReasoning}
            />
          )}
          <div ref={bottomRef} />
        </div>
      )}
      <MessageInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  );
}

const suggestions = [
  'What can you help me with?',
  'Explain how memory and caching work together',
  'Guide me through the system health panel',
  'Help me set up MCP tools for development',
  'What can the Player panel do?',
];

const welcomeTips = [
  '🧠 LongMa remembers everything across sessions with 7-layer memory',
  '⚡ Three-tier cache (Hot/Warm/Cold) keeps responses fast and cheap',
  '🎵 Try the Player panel to listen to music while you work',
  '🔊 Voice panel can speak responses aloud using system TTS',
  '📊 Health panel shows your system status at a glance',
  '💡 Cache hit rate = cost savings. Aim for >70% with DeepSeek Flash',
  '🔄 LongMa runs in the background even when the window is closed',
  '🔧 MCP tools extend LongMa with unlimited capabilities',
  '📈 Cost dashboard tracks every penny spent on API calls',
  '🎯 R1 thinking chain shows you the model reasoning process',
];

const styles: Record<string, any> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
    position: 'relative',
  },
  logoRing: {
    width: 80,
    height: 80,
    borderRadius: 24,
    background: 'linear-gradient(135deg, rgba(79, 111, 255, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    boxShadow: '0 0 40px rgba(79, 111, 255, 0.1)',
    animation: 'glowPulse 3s ease-in-out infinite',
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    background: 'var(--gradient-brand)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 700,
    color: '#fff',
    boxShadow: '0 0 30px rgba(79, 111, 255, 0.3)',
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '-0.5px',
    marginBottom: 4,
  },
  gradientText: {
    background: 'var(--gradient-brand)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    backgroundSize: '200% 200%',
    animation: 'gradientShift 4s ease infinite',
  },
  emptySub: {
    fontSize: 14,
    color: 'var(--text-muted)',
    letterSpacing: '0.3px',
  },
  statsBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: '4px 12px',
    borderRadius: 20,
    background: 'rgba(63, 185, 80, 0.1)',
    border: '1px solid rgba(63, 185, 80, 0.2)',
    color: 'var(--success)',
    fontSize: 11,
    fontWeight: 600,
  },
  shortcuts: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  shortcut: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  shortcutSep: {
    color: 'var(--border-default)',
  },
  kbd: {
    padding: '2px 6px',
    borderRadius: 4,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-default)',
    fontSize: 10,
    fontFamily: 'inherit',
    color: 'var(--text-secondary)',
  },
  tipRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: '6px 14px',
    borderRadius: 8,
    background: 'var(--accent-subtle)',
    fontSize: 12,
    color: 'var(--text-secondary)',
    maxWidth: 400,
    animation: 'fadeSlideIn 400ms ease both',
  },
  tipIcon: {
    fontSize: 12,
  },
  tipText: {
    animation: 'fadeSlideIn 300ms ease both',
  },
  suggestions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginTop: 20,
    width: '100%',
    maxWidth: 360,
  },
  suggestionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    fontSize: 13,
    color: 'var(--text-secondary)',
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 10,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all var(--transition-fast)',
    backdropFilter: 'blur(8px)',
  },
  poweredBy: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  modelBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 10px',
    borderRadius: 12,
    background: 'rgba(79, 111, 255, 0.12)',
    color: 'var(--accent-primary)',
    border: '1px solid rgba(79, 111, 255, 0.25)',
    fontWeight: 600,
    fontSize: 11,
  },
  modelDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    display: 'inline-block',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  messageList: {
    flex: 1,
    overflow: 'auto',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
};
