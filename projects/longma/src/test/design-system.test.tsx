import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentStatus, type AgentState } from '../design-system/AgentStatus';
import GradientText from '../design-system/GradientText';
import GlassPanel from '../design-system/GlassPanel';
import { Button, IconButton } from '../design-system/Button';

describe('AgentStatus', () => {
  const states: AgentState[] = ['idle', 'thinking', 'speaking', 'error'];

  states.forEach((state) => {
    it(`renders ${state} state`, () => {
      render(<AgentStatus state={state} />);
      const el = screen.getByText(state.charAt(0).toUpperCase() + state.slice(1));
      expect(el).toBeInTheDocument();
    });
  });

  it('renders with progress', () => {
    render(<AgentStatus state="thinking" progress={0.75} />);
    expect(screen.getByText('Thinking')).toBeInTheDocument();
  });
});

describe('GradientText', () => {
  it('renders text with gradient', () => {
    render(<GradientText>Hello World</GradientText>);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('renders with variant gradient', () => {
    render(<GradientText variant="primary">Primary</GradientText>);
    expect(screen.getByText('Primary')).toBeInTheDocument();
  });

  it('applies custom gradient as inline style', () => {
    const { container } = render(
      <GradientText gradient="linear-gradient(90deg, red, blue)">Custom</GradientText>
    );
    const span = container.querySelector('span');
    expect(span).toBeInTheDocument();
    expect(span).toHaveStyle({ background: 'linear-gradient(90deg, red, blue)' });
  });
});

describe('GlassPanel', () => {
  it('renders children', () => {
    render(<GlassPanel><span>Content</span></GlassPanel>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders with accent variant', () => {
    render(<GlassPanel variant="accent">Accent</GlassPanel>);
    expect(screen.getByText('Accent')).toBeInTheDocument();
  });
});

describe('Button', () => {
  it('renders button text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const userEvent = (await import('@testing-library/user-event')).default;
    let clicked = false;
    render(<Button onClick={() => { clicked = true; }}>Click</Button>);
    await userEvent.click(screen.getByText('Click'));
    expect(clicked).toBe(true);
  });
});

describe('IconButton', () => {
  it('renders with label and icon', () => {
    render(<IconButton label="Close" icon={<span>X</span>} />);
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
    expect(screen.getByText('X')).toBeInTheDocument();
  });
});
