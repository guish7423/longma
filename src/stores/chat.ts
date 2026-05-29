import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useSessionStore } from './session';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoningContent?: string;
  tokens?: {
    input: number;
    output: number;
    cacheHit: number;
    total: number;
    cacheHitRatio: number;
  };
  /** True when message was served from local cache, not API */
  cached?: boolean;
}

interface StreamChunk {
  content: string;
  reasoning_content: string | null;
  finish_reason: string | null;
  input_tokens: number;
  output_tokens: number;
  cache_hit_tokens: number;
  done: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  streamingReasoning: string;
  conversations: { id: number; title: string }[];
  currentConversationId: number | null;
  abortController: AbortController | null;
  /** Whether budget is exhausted and chat is blocked */
  budgetBlocked: boolean;

  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  setMessages: (messages: ChatMessage[]) => void;
  stopStreaming: () => void;
  loadConversations: () => Promise<void>;
  selectConversation: (id: number) => Promise<void>;
  newConversation: () => void;
  deleteConversation: (id: number) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  streamingContent: '',
  streamingReasoning: '',
  conversations: [],
  currentConversationId: null,
  abortController: null,
  budgetBlocked: false,

  stopStreaming: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }
    set({ isStreaming: false, abortController: null, streamingContent: '' });
    useSessionStore.getState().setAgentState('idle');
  },

  loadConversations: async () => {
    try {
      const convs = await invoke<{ id: number; title: string }[]>('list_conversations');
      set({ conversations: convs });
    } catch {
      // Not yet implemented in backend
    }
  },

  selectConversation: async (id: number) => {
    try {
      const msgs = await invoke<{ role: string; content: string }[]>('get_conversation_messages', { conversationId: id });
      set({
        currentConversationId: id,
        messages: msgs.map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });
    } catch {
      // Fallback
    }
  },

  newConversation: () => {
    set({ currentConversationId: null, messages: [], streamingContent: '' });
  },

  deleteConversation: async (id: number) => {
    try {
      await invoke('delete_conversation', { id });
      const { conversations, currentConversationId } = get();
      set({
        conversations: conversations.filter((c) => c.id !== id),
      });
      if (currentConversationId === id) {
        set({ currentConversationId: null, messages: [] });
      }
    } catch {
      // Fallback
    }
  },

  sendMessage: async (content: string) => {
    const { messages, isStreaming } = get();
    if (isStreaming || !content.trim()) return;

    const session = useSessionStore.getState();
    if (!session.hasApiKey) return;

    // ── 1. Budget Check ────────────────────────────────────────────
    try {
      const budget = await invoke<any>('get_budget_status');
      if (budget.daily_budget_usd !== null) {
        const remaining = budget.daily_budget_usd - budget.daily_spend;
        if (remaining <= 0) {
          set({ budgetBlocked: true });
          session.setAgentState('error');
          return;
        }
        set({ budgetBlocked: false });
      }
    } catch {
      // Budget check is advisory; continue if it fails
    }

    // ── 2. TICK Activity Notification ──────────────────────────────
    try {
      await invoke('notify_activity');
    } catch {
      // Non-critical
    }

    // ── 3. Cache Lookup (hot-cache fast path) ──────────────────────
    const cacheKey = `q:${content.trim().toLowerCase().slice(0, 200)}`;
    try {
      const cached = await invoke<[string, string] | null>('cache_lookup', { key: cacheKey });
      if (cached) {
        const [cachedContent] = cached;
        const userMessage: ChatMessage = { role: 'user', content };
        const cachedMsg: ChatMessage = {
          role: 'assistant',
          content: cachedContent,
          cached: true,
          tokens: { input: 0, output: 0, cacheHit: 0, total: 0, cacheHitRatio: 0 },
        };
        set({
          messages: [...messages, userMessage, cachedMsg],
        });
        return;
      }
    } catch {
      // Cache miss or unavailable — proceed to API call
    }

    const userMessage: ChatMessage = { role: 'user', content };
    const updatedMessages = [...messages, userMessage];
    set({
      messages: updatedMessages,
      isStreaming: true,
      streamingContent: '',
    });
    session.setAgentState('thinking');

    // ── 4. Listen for stream chunks ────────────────────────────────
    const unlisten = await listen<StreamChunk>('chat-chunk', (event) => {
      const chunk = event.payload;
      const state = get();

      if (chunk.done) {
        const fullContent = state.streamingContent;
        const fullReasoning = state.streamingReasoning;
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: fullContent,
          reasoningContent: fullReasoning || undefined,
          tokens: {
            input: chunk.input_tokens,
            output: chunk.output_tokens,
            cacheHit: chunk.cache_hit_tokens,
            total: chunk.input_tokens + chunk.output_tokens,
            cacheHitRatio: chunk.input_tokens > 0
              ? chunk.cache_hit_tokens / chunk.input_tokens
              : 0,
          },
        };

        session.updateStats(chunk.input_tokens, chunk.output_tokens, chunk.cache_hit_tokens);

        // ── 5. Record Budget Spend ──────────────────────────────
        try {
          const inputCost = (chunk.input_tokens / 1_000_000) * 0.15;
          const outputCost = (chunk.output_tokens / 1_000_000) * 0.60;
          invoke('record_budget_spend', {
            cost: inputCost + outputCost,
            conversationId: 0, // Will be replaced with real ID when available
          });
        } catch {
          // Non-critical
        }

        // ── 6. Cache Insert ──────────────────────────────────────
        if (fullContent.trim()) {
          try {
            invoke('cache_insert', {
              key: cacheKey,
              content: fullContent,
              tokenCount: chunk.output_tokens,
            });
          } catch {
            // Non-critical
          }
        }

        set({
          messages: [...state.messages, assistantMessage],
          isStreaming: false,
          streamingContent: '',
          streamingReasoning: '',
        });
        session.setAgentState('idle');
        unlisten();
        get().loadConversations();
        return;
      }

      set({
        streamingContent: state.streamingContent + chunk.content,
        streamingReasoning: state.streamingReasoning + (chunk.reasoning_content || ''),
      });
    });

    try {
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      await invoke('chat_stream', {
        messages: apiMessages,
        temperature: null,
        maxTokens: null,
      });
    } catch (error) {
      const state = get();

      // ── 7. Record Budget Failure ──────────────────────────────
      try {
        await invoke('record_budget_failure');
      } catch {
        // Non-critical
      }

      set({
        isStreaming: false,
        streamingContent: '',
        messages: [
          ...state.messages,
          {
            role: 'assistant' as const,
            content: `Error: ${error}`,
          },
        ],
      });
      session.setAgentState('error');
      unlisten();
    }
  },

  clearMessages: () => {
    get().stopStreaming();
    set({ messages: [], streamingContent: '' });
  },

  setMessages: (messages) => set({ messages }),
}));
