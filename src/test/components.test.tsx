import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageBubble from '../components/Chat/MessageBubble';
import MessageInput from '../components/Chat/MessageInput';
import StreamingText from '../components/Chat/StreamingText';
import MemoryPanel from '../components/Memory/MemoryPanel';
import TaskStackPanel from '../components/Tick/TaskStackPanel';
import TickIndicator from '../components/Tick/TickIndicator';
import CostDashboard from '../components/CostDashboard/CostDashboard';

describe('MessageBubble', () => {
  it('renders user message', () => {
    render(<MessageBubble message={{ role: 'user', content: 'Hello' }} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders assistant message', () => {
    render(<MessageBubble message={{ role: 'assistant', content: 'Hi there' }} />);
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  it('renders system message', () => {
    render(<MessageBubble message={{ role: 'system', content: 'System instruction' }} />);
    expect(screen.getByText('System instruction')).toBeInTheDocument();
  });

  it('shows reasoning content in collapsible panel', () => {
    const { container } = render(
      <MessageBubble 
        message={{ 
          role: 'assistant', 
          content: 'Answer', 
          reasoningContent: 'Step-by-step reasoning' 
        }} 
      />
    );
    expect(screen.getByText('Answer')).toBeInTheDocument();
    // Reasoning toggle shows "Thought · N words"
    expect(container.textContent).toContain('Thought');
    expect(container.textContent).toContain('words');
  });

  it('renders streaming state', () => {
    render(
      <MessageBubble 
        message={{ role: 'assistant', content: '' }} 
        isStreaming={true}
        streamingContent="Partial response"
      />
    );
    expect(screen.getByText('Partial response')).toBeInTheDocument();
  });

  it('shows token info when available', () => {
    const { container } = render(
      <MessageBubble 
        message={{ 
          role: 'assistant', 
          content: 'Answer with tokens',
          tokens: { input: 100, output: 50, cacheHit: 30, total: 150, cacheHitRatio: 0.3 }
        }} 
      />
    );
    expect(screen.getByText('Answer with tokens')).toBeInTheDocument();
    // Token footer shows "N tokens · N% cache"
    expect(container.textContent).toContain('150 tokens');
    expect(container.textContent).toContain('30% cache');
  });
});

describe('MessageInput', () => {
  it('renders textarea', () => {
    const { container } = render(<MessageInput onSend={() => {}} />);
    const textarea = container.querySelector('textarea');
    expect(textarea).toBeInTheDocument();
  });

  it('calls onSend when Enter is pressed', async () => {
    const userEvent = (await import('@testing-library/user-event')).default;
    let sentContent = '';
    const { container } = render(<MessageInput onSend={(c) => { sentContent = c; }} />);
    const textarea = container.querySelector('textarea')!;
    await userEvent.type(textarea, 'Test message');
    await userEvent.keyboard('{Enter}');
    // Allow state update
    await new Promise(r => setTimeout(r, 50));
    expect(sentContent).toBe('Test message');
  });
});

describe('StreamingText', () => {
  it('renders plain text', () => {
    const { container } = render(<StreamingText content="Hello world" />);
    expect(container.textContent).toContain('Hello world');
  });

  it('renders code blocks', () => {
    const { container } = render(
      <StreamingText content={'```typescript\nconst x = 1;\n```'} />
    );
    expect(container.textContent).toContain('const x = 1;');
  });
});

describe('MemoryPanel', () => {
  it('renders panel heading', () => {
    render(<MemoryPanel />);
    expect(screen.getByText(/memory/i)).toBeTruthy();
  });
});

describe('TaskStackPanel', () => {
  it('renders without crashing (empty state = null)', () => {
    const { container } = render(<TaskStackPanel />);
    // Empty state returns null; main assertion is no crash
    expect(container.firstChild).toBeNull();
  });
});

describe('TickIndicator', () => {
  it('renders without crashing', () => {
    const { container } = render(<TickIndicator />);
    expect(container.firstChild).toBeTruthy();
  });
});

describe('CostDashboard', () => {
  it('renders initial loading state', () => {
    render(<CostDashboard />);
    expect(screen.getByText(/loading/i)).toBeTruthy();
  });
});
