import { useMemo } from 'react';

interface StreamingTextProps {
  content: string;
}

export default function StreamingText({ content }: StreamingTextProps) {
  // Split by code blocks for potential syntax highlighting
  const segments = useMemo(() => {
    const parts: { type: 'text' | 'code'; lang?: string; content: string }[] = [];
    const codeRegex = /```(\w*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'code', lang: match[1] || undefined, content: match[2] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      // Check for unclosed code block
      const remaining = content.slice(lastIndex);
      const openBlock = remaining.match(/^```(\w*)\n?/);
      if (openBlock) {
        parts.push({ type: 'code', lang: openBlock[1] || undefined, content: remaining.slice(openBlock[0].length) });
      } else if (remaining.includes('```')) {
        parts.push({ type: 'code', content: remaining.replace(/```\w*\n?/, '') });
      } else {
        parts.push({ type: 'text', content: remaining });
      }
    }

    return parts;
  }, [content]);

  return (
    <div style={styles.container}>
      {segments.map((seg, i) =>
        seg.type === 'code' ? (
          <div key={i} style={styles.codeBlock}>
            {seg.lang && <div style={styles.codeLang}>{seg.lang}</div>}
            <pre style={styles.code}><code>{seg.content}</code></pre>
          </div>
        ) : (
          <span key={i} style={styles.text}>{seg.content}</span>
        )
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    lineHeight: 1.6,
  },
  text: {
    whiteSpace: 'pre-wrap',
  },
  codeBlock: {
    margin: '8px 0',
    borderRadius: 8,
    overflow: 'hidden',
    background: '#0d1117',
    border: '1px solid #30363d',
  },
  codeLang: {
    padding: '4px 12px',
    fontSize: 11,
    color: '#8b949e',
    background: '#161b22',
    borderBottom: '1px solid #30363d',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  code: {
    padding: '12px 16px',
    margin: 0,
    fontSize: 13,
    fontFamily: 'JetBrains Mono, Fira Code, monospace',
    lineHeight: 1.5,
    color: '#e6edf3',
    overflow: 'auto',
    whiteSpace: 'pre',
  },
};
