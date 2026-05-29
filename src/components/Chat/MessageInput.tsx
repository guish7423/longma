import { useState, useRef, KeyboardEvent } from 'react';
import { useSessionStore } from '../../stores/session';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
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
        <div style={{
          ...styles.inputWrapper,
          borderColor: focused ? 'var(--accent-primary)' : 'var(--border-default)',
          boxShadow: focused ? '0 0 0 1px var(--accent-primary), 0 0 20px rgba(79, 111, 255, 0.08)' : 'none',
        }}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Ask LongMa anything..."
            disabled={disabled}
            rows={1}
            style={styles.textarea}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          style={styles.sendBtn(disabled || !value.trim())}
          className="click-scale"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
      <div style={styles.footer}>
        <button style={styles.modelToggle} onClick={cycleModel} className="click-scale">
          <span style={{
            width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
            background: model === 'deepseek-v4-pro' ? '#a78bfa' : 'var(--accent-primary)',
          }} />
          {model === 'deepseek-v4-pro' ? 'Pro' : 'Flash'}
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
  inputWrapper: {
    flex: 1,
    borderRadius: 12,
    border: '1px solid var(--border-default)',
    transition: 'border-color 200ms ease, box-shadow 200ms ease',
    background: 'var(--bg-secondary)',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 14,
    fontFamily: 'inherit',
    color: 'var(--text-primary)',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    resize: 'none',
    lineHeight: 1.5,
    maxHeight: 200,
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
    transition: 'all var(--transition-fast)',
  },
  hint: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
};
