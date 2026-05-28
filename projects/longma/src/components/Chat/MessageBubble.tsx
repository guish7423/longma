import type { ChatMessage } from '../../stores/chat';
import StreamingText from './StreamingText';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  streamingContent?: string;
}

export default function MessageBubble({ message, isStreaming, streamingContent }: MessageBubbleProps) {
  const isUser = message.role === 'user';


  return (
    <div style={styles.wrapper(isUser)}>
      {!isUser && (
        <div style={styles.avatar}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
      )}
      <div style={styles.bubbleGroup}>
        <div style={styles.bubble(isUser)}>
          {isStreaming && streamingContent ? (
            <StreamingText content={streamingContent} />
          ) : (
            <div style={styles.content}>{message.content}</div>
          )}
          {isStreaming && streamingContent === '' && (
            <div style={styles.cursorBlink} />
          )}
        </div>
        {!isUser && message.tokens && (
          <div style={styles.tokens}>
            {message.tokens.total > 0 && `${message.tokens.total} tokens · `}
            {message.tokens.cacheHitRatio > 0 && `${(message.tokens.cacheHitRatio * 100).toFixed(0)}% cache`}
          </div>
        )}
      </div>
      {isUser && (
        <div style={styles.avatarUser}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21v-1a6 6 0 0 1 12 0v1" />
          </svg>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, any> = {
  wrapper: (isUser: boolean) => ({
    display: 'flex',
    gap: 12,
    padding: '6px 0',
    flexDirection: isUser ? 'row-reverse' : 'row' as any,
    alignItems: 'flex-start',
  }),
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, #7c3aed 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    flexShrink: 0,
  },
  avatarUser: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-default)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
  bubbleGroup: {
    maxWidth: '70%',
    minWidth: 0,
  },
  bubble: (isUser: boolean) => ({
    padding: '10px 16px',
    borderRadius: 14,
    background: isUser ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
    color: isUser ? '#fff' : 'var(--text-primary)',
    fontSize: 14,
    lineHeight: 1.6,
    borderBottomRightRadius: isUser ? 4 : 14,
    borderBottomLeftRadius: isUser ? 14 : 4,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  }),
  content: {
    whiteSpace: 'pre-wrap',
  },
  cursorBlink: {
    display: 'inline-block',
    width: 8,
    height: 16,
    background: 'var(--text-primary)',
    animation: 'blink 1s step-end infinite',
    verticalAlign: 'text-bottom',
    borderRadius: 1,
  },
  tokens: {
    fontSize: 11,
    color: 'var(--text-muted)',
    padding: '4px 4px 0',
    fontVariantNumeric: 'tabular-nums',
  },
};
