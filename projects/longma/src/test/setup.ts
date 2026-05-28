import '@testing-library/jest-dom/vitest';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockImplementation((cmd: string, _args?: Record<string, unknown>) => {
    // Provide sensible defaults for common commands used in tests
    switch (cmd) {
      case 'get_app_info':
        return Promise.resolve({ name: 'LongMa', version: '0.1.0', model: 'deepseek-v4-flash' });
      case 'get_config':
        return Promise.resolve({
          api_key: 'test-key',
          model: 'deepseek-v4-flash',
          temperature: 0.7,
          max_tokens: 4096,
          daily_budget_usd: null,
          auto_compress: false,
          compress_threshold: 4000,
          prefer_flash: true,
          mcp_servers: [],
        });
      case 'get_budget_status':
        return Promise.resolve({
          date: '2026-05-28',
          daily_spend: 0,
          daily_budget_usd: null,
          total_requests: 0,
          failed_requests: 0,
          conversation_spend: {},
          prefer_flash: true,
          auto_compress: false,
          compress_threshold: 4000,
        });
      case 'get_session_state':
        return Promise.resolve({ state: 'idle', current_turn_cost: null, total_cost: 0 });
      case 'list_suspended_tasks':
        return Promise.resolve([]);
      case 'list_memories':
        return Promise.resolve([]);
      default:
        return Promise.resolve(null);
    }
  }),
}));

// Mock Tauri event listener
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(vi.fn()),
}));
