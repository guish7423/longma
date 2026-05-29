import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from '../stores/session';

describe('session store', () => {
  beforeEach(() => {
    useSessionStore.setState({
      view: 'chat',
      agentState: 'idle',
      phase: 'splash',
      hasApiKey: false,
      model: 'deepseek-v4-flash',
      temperature: 0.7,
      maxTokens: 4096,
      stats: {
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cache_hit_tokens: 0,
        total_cost: 0,
      },
    });
  });

  it('initializes with default state', () => {
    const state = useSessionStore.getState();
    expect(state.view).toBe('chat');
    expect(state.agentState).toBe('idle');
    expect(state.hasApiKey).toBe(false);
    expect(state.model).toBe('deepseek-v4-flash');
  });

  it('updates agent state', () => {
    useSessionStore.getState().setAgentState('thinking');
    expect(useSessionStore.getState().agentState).toBe('thinking');
    useSessionStore.getState().setAgentState('error');
    expect(useSessionStore.getState().agentState).toBe('error');
  });

  it('tracks token stats correctly', () => {
    useSessionStore.getState().updateStats(100, 50, 20);
    const s = useSessionStore.getState().stats;
    expect(s.total_input_tokens).toBe(100);
    expect(s.total_output_tokens).toBe(50);
    expect(s.total_cache_hit_tokens).toBe(20);
  });

  it('accumulates stats over multiple updates', () => {
    useSessionStore.getState().updateStats(1000, 500, 200);
    useSessionStore.getState().updateStats(2000, 1000, 500);
    const s = useSessionStore.getState().stats;
    expect(s.total_input_tokens).toBe(3000);
    expect(s.total_output_tokens).toBe(1500);
    expect(s.total_cache_hit_tokens).toBe(700);
  });

  it('navigates between views', () => {
    useSessionStore.getState().setView('dashboard');
    expect(useSessionStore.getState().view).toBe('dashboard');
    useSessionStore.getState().setView('settings');
    expect(useSessionStore.getState().view).toBe('settings');
    useSessionStore.getState().setView('chat');
    expect(useSessionStore.getState().view).toBe('chat');
  });

  it('resets stats correctly', () => {
    useSessionStore.getState().updateStats(500, 200, 100);
    useSessionStore.getState().resetStats();
    const s = useSessionStore.getState().stats;
    expect(s.total_input_tokens).toBe(0);
    expect(s.total_output_tokens).toBe(0);
    expect(s.total_cache_hit_tokens).toBe(0);
    expect(s.total_cost).toBe(0);
  });

  it('calculates cost in stats', () => {
    useSessionStore.getState().updateStats(1_000_000, 1_000_000, 500_000);
    const s = useSessionStore.getState().stats;
    // Flash: miss=500000@0.07 + cached=500000@0.006 + output=1000000@0.28 = per million
    const expectedCost = ((500000 * 0.07 + 500000 * 0.006 + 1000000 * 0.28) / 1_000_000);
    expect(s.total_cost).toBeCloseTo(expectedCost, 6);
  });
});
