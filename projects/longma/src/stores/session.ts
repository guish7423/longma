import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { AgentState } from '../design-system/AgentStatus';

interface Config {
  api_key: string;
  model: string;
  temperature: number;
  max_tokens: number;
}

interface SessionStats {
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_hit_tokens: number;
  total_cost: number;
}

interface SessionState {
  // Agent state
  agentState: AgentState;
  setAgentState: (state: AgentState) => void;

  // Model
  model: string;
  setModel: (model: string) => void;

  // Config
  config: Config | null;
  loadConfig: () => Promise<void>;
  saveApiKey: (key: string) => Promise<void>;
  switchModel: (model: string) => Promise<void>;
  hasApiKey: boolean;

  // Stats
  stats: SessionStats;
  updateStats: (input: number, output: number, cached: number) => void;
  resetStats: () => void;

  // App phase
  phase: 'splash' | 'onboarding' | 'main';
  setPhase: (phase: 'splash' | 'onboarding' | 'main') => void;

  // View
  view: 'chat' | 'dashboard' | 'settings';
  setView: (view: 'chat' | 'dashboard' | 'settings') => void;

  // Temperature / max tokens
  temperature: number;
  maxTokens: number;
  setTemperature: (t: number) => Promise<void>;
  setMaxTokens: (mt: number) => Promise<void>;
}

const FLASH_INPUT = 0.07;
const FLASH_CACHED = 0.006;
const FLASH_OUTPUT = 0.28;

function calcCost(input: number, output: number, cached: number): number {
  const miss = input - cached;
  return (miss * FLASH_INPUT + cached * FLASH_CACHED + output * FLASH_OUTPUT) / 1_000_000;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  agentState: 'idle',
  setAgentState: (state) => set({ agentState: state }),

  model: 'deepseek-v4-flash',
  setModel: (model) => set({ model }),

  config: null,
  hasApiKey: false,

  loadConfig: async () => {
    try {
      const config = await invoke<Config>('get_config');
      set({
        config,
        hasApiKey: !!config.api_key,
        model: config.model || 'deepseek-v4-flash',
        temperature: config.temperature || 0.7,
        maxTokens: config.max_tokens || 4096,
      });
    } catch {
      // Config not available yet
    }
  },

  saveApiKey: async (key: string) => {
    await invoke('save_api_key', { apiKey: key });
    set({ hasApiKey: true });
    await get().loadConfig();
  },

  switchModel: async (model: string) => {
    await invoke('switch_model', { model });
    set({ model });
  },

  stats: {
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_cache_hit_tokens: 0,
    total_cost: 0,
  },

  updateStats: (input, output, cached) => {
    const prev = get().stats;
    const cost = calcCost(input, output, cached);
    set({
      stats: {
        total_input_tokens: prev.total_input_tokens + input,
        total_output_tokens: prev.total_output_tokens + output,
        total_cache_hit_tokens: prev.total_cache_hit_tokens + cached,
        total_cost: prev.total_cost + cost,
      },
    });
  },

  resetStats: () => {
    set({
      stats: {
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cache_hit_tokens: 0,
        total_cost: 0,
      },
    });
  },

  setPhase: (phase) => set({ phase }),
  phase: 'splash',

  view: 'chat',
  setView: (view) => set({ view }),

  temperature: 0.7,
  maxTokens: 4096,

  setTemperature: async (t: number) => {
    await invoke('update_config', { temperature: t });
    set({ temperature: t });
  },
  setMaxTokens: async (mt: number) => {
    await invoke('update_config', { maxTokens: mt });
    set({ maxTokens: mt });
  },
}));
