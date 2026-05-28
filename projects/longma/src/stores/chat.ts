import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useSessionStore } from './session';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens?: {
    input: number;
    output: number;
    cacheHit: number;
    total: number;
    cacheHitRatio: number;
  };
}

interface StreamChunk {
  content: string;
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
  conversations: { id: number; title: string }[];
  currentConversationId: number | null;
  abortController: AbortController | null;

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
  conversations: [],
  currentConversationId: null,
  abortController: null,

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

    const userMessage: ChatMessage = { role: 'user', content };
    const updatedMessages = [...messages, userMessage];
    set({
      messages: updatedMessages,
      isStreaming: true,
      streamingContent: '',
    });
    session.setAgentState('thinking');

    // Listen for stream chunks
    const unlisten = await listen<StreamChunk>('chat-chunk', (event) => {
      const chunk = event.payload;
      const state = get();

      if (chunk.done) {
        const fullContent = state.streamingContent;
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: fullContent,
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

        set({
          messages: [...state.messages, assistantMessage],
          isStreaming: false,
          streamingContent: '',
        });
        session.setAgentState('idle');
        unlisten();
        get().loadConversations();
        return;
      }

      set({
        streamingContent: state.streamingContent + chunk.content,
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
