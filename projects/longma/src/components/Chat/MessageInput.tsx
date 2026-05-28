import { useState, useRef, KeyboardEvent } from 'react';
import { useSessionStore } from '../../stores/session';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState('');
  const { model, switchModel } = useSessionStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  };

  const cycleModel = () => {
    const next = model === 'deepseek-v4-flash' ? 'deepseek-v4-pro' : 'deepseek-v4-flash';
    switchModel(next);
  };

  return (
    <div style={styles.container}>
      <div style={styles.inputRow}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Ask LongMa anything..."
          disabled={disabled}
          rows={1}
          style={styles.textarea}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          style={styles.sendBtn(disabled || !value.trim())}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
      <div style={styles.footer}>
        <button style={styles.modelToggle} onClick={cycleModel}>
          {model === 'deepseek-v4-pro' ? (
            <><span style={{ color: '#a78bfa' }}>●</span> Pro</>
          ) : (
            <><span style={{ color: 'var(--accent-primary)' }}>●</span> Flash</>
          )}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <span style={styles.hint}>Enter to send · Shift+Enter for new line</span>
      </div>
    </div>
  );
}

const styles: Record<string, any> = {
  container: {
    borderTop: '1px solid var(--border-default)',
    padding: '12px 20px 8px',
    background: 'var(--bg-primary)',
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1,
    padding: '12px 16px',
    fontSize: 14,
    fontFamily: 'inherit',
    color: 'var(--text-primary)',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-default)',
    borderRadius: 12,
    outline: 'none',
    resize: 'none',
    lineHeight: 1.5,
    maxHeight: 200,
    transition: 'border-color 0.15s ease',
  },
  sendBtn: (disabled: boolean) => ({
    width: 42,
    height: 42,
    borderRadius: 12,
    border: 'none',
    background: disabled ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
    color: disabled ? 'var(--text-muted)' : '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  }),
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 4px 0',
  },
  modelToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  hint: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
};
