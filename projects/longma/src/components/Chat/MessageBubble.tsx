import { useState, useCallback } from 'react';
import type { ChatMessage } from '../../stores/chat';
import StreamingText from './StreamingText';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  streamingContent?: string;
  streamingReasoning?: string;
  style?: React.CSSProperties;
}

export default function MessageBubble({
  message,
  isStreaming,
  streamingContent,
  streamingReasoning,
  style: customStyle,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const hasReasoning = !!(message.reasoningContent || streamingReasoning);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = message.content || streamingContent || '';
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [message.content, streamingContent]);

  return (
    <div
      style={{ ...styles.wrapper(isUser), ...customStyle }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); }}
    >
      {!isUser && (
        <div style={styles.avatar}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
      )}

      <div style={styles.bubbleGroup}>
        {/* Reasoning block */}
        {hasReasoning && (
          <div style={styles.reasoningBlock}>
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              style={styles.reasoningToggle}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  transform: showReasoning ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 200ms ease',
                }}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
              <span style={styles.thinkingDot} />
              <span style={{ fontSize: 12, fontWeight: 500 }}>
                {isStreaming ? 'Thinking...' : `Thought${showReasoning ? '' : ` · ${countWords(message.reasoningContent || streamingReasoning || '')} words`}`}
              </span>
            </button>
            {showReasoning && (
              <div style={styles.reasoningContent}>
                {isStreaming && streamingReasoning ? (
                  <StreamingText content={streamingReasoning} />
                ) : (
                  message.reasoningContent
                )}
              </div>
            )}
          </div>
        )}

        {/* Main bubble */}
        <div style={styles.bubbleRow}>
          <div style={styles.bubble(isUser)}>
            {isStreaming && streamingContent ? (
              <StreamingText content={streamingContent} />
            ) : (
              <div style={styles.content}>{message.content}</div>
            )}
            {isStreaming && streamingContent === '' && !streamingReasoning && (
              <div style={styles.cursorBlink} />
            )}
          </div>

          {/* Copy button on hover */}
          {!isUser && showActions && !isStreaming && (
            <button
              onClick={handleCopy}
              style={styles.actionBtn}
              title="Copy message"
            >
              {copied ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Token info */}
        {!isUser && message.tokens && (
          <div style={styles.tokens}>
            {message.tokens.total > 0 && `${message.tokens.total} tokens`}
            {message.tokens.total > 0 && message.tokens.cacheHitRatio > 0 && ' · '}
            {message.tokens.cacheHitRatio > 0 &&
              `${(message.tokens.cacheHitRatio * 100).toFixed(0)}% cache`}
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

function countWords(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

const thinkingColor = '#a78bfa';

const styles: Record<string, any> = {
  wrapper: (isUser: boolean) => ({
    display: 'flex',
    gap: 12,
    padding: '3px 0',
    flexDirection: isUser ? 'row-reverse' : 'row' as any,
    alignItems: 'flex-start',
    animation: 'messageSlideIn 350ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
  }),
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: 'var(--gradient-brand)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    flexShrink: 0,
    boxShadow: '0 0 12px rgba(79, 111, 255, 0.3)',
    position: 'sticky' as const,
    top: 6,
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
    position: 'sticky' as const,
    top: 6,
  },
  bubbleGroup: {
    maxWidth: '75%',
    minWidth: 0,
  },
  reasoningBlock: {
    background: 'rgba(79, 111, 255, 0.06)',
    border: '1px solid rgba(79, 111, 255, 0.2)',
    borderRadius: 10,
    marginBottom: 6,
    overflow: 'hidden',
    fontSize: 13,
    backdropFilter: 'blur(8px)',
  },
  reasoningToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 12px',
    background: 'none',
    border: 'none',
    color: thinkingColor,
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left' as const,
    fontSize: 13,
    fontFamily: 'inherit',
    transition: 'background 150ms ease',
  },
  thinkingDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: thinkingColor,
    display: 'inline-block',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  reasoningContent: {
    padding: '0 12px 10px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    borderTop: '1px solid rgba(79, 111, 255, 0.2)',
    fontSize: 12.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontStyle: 'italic',
    opacity: 0.85,
  },
  bubbleRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 6,
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
    transition: 'box-shadow 200ms ease',
  }),
  content: {
    whiteSpace: 'pre-wrap',
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: '1px solid var(--border-default)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 150ms ease',
    animation: 'scaleIn 150ms ease both',
    opacity: 0.7,
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
    padding: '3px 4px 0',
    fontVariantNumeric: 'tabular-nums',
    opacity: 0.7,
  },
};
