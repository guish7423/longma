import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, style, ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {label && (
          <label style={{ fontSize: 13, color: '#8b949e', fontWeight: 500 }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          style={{
            padding: '8px 12px',
            fontSize: 14,
            fontFamily: 'inherit',
            color: '#e6edf3',
            background: '#161b22',
            border: `1px solid ${error ? '#f85149' : '#30363d'}`,
            borderRadius: 8,
            outline: 'none',
            transition: 'border-color 150ms ease',
            height: 36,
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#4f6fff';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? '#f85149' : '#30363d';
          }}
          {...props}
        />
        {error && <span style={{ fontSize: 12, color: '#f85149' }}>{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, style, ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {label && (
          <label style={{ fontSize: 13, color: '#8b949e', fontWeight: 500 }}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          style={{
            padding: '10px 12px',
            fontSize: 14,
            fontFamily: 'inherit',
            lineHeight: 1.5,
            color: '#e6edf3',
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: 8,
            outline: 'none',
            resize: 'none',
            transition: 'border-color 150ms ease',
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#4f6fff';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#30363d';
          }}
          {...props}
        />
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
