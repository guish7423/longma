import { useEffect, useRef } from 'react';
import { useChatStore } from '../../stores/chat';
import { useSessionStore } from '../../stores/session';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

export default function ChatView() {
  const { messages, isStreaming, streamingContent, sendMessage } = useChatStore();

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  useEffect(() => {
    useSessionStore.getState().loadConfig();
  }, []);

  return (
    <div style={styles.container}>
      {messages.length === 0 && !isStreaming ? (
        <div style={styles.empty}>
          <div style={styles.logo}>LM</div>
          <h1 style={styles.emptyTitle}>LongMa</h1>
          <p style={styles.emptySub}>DeepSeek-native AI Agent</p>
          <div style={styles.suggestions}>
            {suggestions.map((s) => (
              <button key={s} style={styles.suggestionBtn} onClick={() => sendMessage(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={styles.messageList}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {isStreaming && (
            <MessageBubble
              message={{ role: 'assistant', content: streamingContent }}
              isStreaming
              streamingContent={streamingContent}
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
  'Explain how prefix caching works',
  'Help me debug a Rust error',
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
    gap: 12,
    padding: 24,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, #7c3aed 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 700,
    color: '#fff',
    boxShadow: '0 0 30px rgba(79, 111, 255, 0.25)',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  emptySub: {
    fontSize: 14,
    color: 'var(--text-muted)',
  },
  suggestions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 24,
    width: '100%',
    maxWidth: 360,
  },
  suggestionBtn: {
    padding: '10px 16px',
    fontSize: 13,
    color: 'var(--text-secondary)',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-default)',
    borderRadius: 10,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  },
  messageList: {
    flex: 1,
    overflow: 'auto',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
};
