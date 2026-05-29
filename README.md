# LongMa (龙马)

> DeepSeek-native desktop AI agent companion — integration of white-hot speculative caching, agentic memory, and MCP tool orchestration.

[![Build](https://github.com/guish7423/longma/actions/workflows/build.yml/badge.svg)](https://github.com/guish7423/longma/actions/workflows/build.yml)

## Architecture

```
┌─────────────────────────────┐
│   React 19 + TypeScript     │ ← ACUI v2 Design System
│   Zustand stores            │   Glass/Gradient/Toast/Motion
├─────────────────────────────┤
│   Tauri v2 (Rust)           │ ← IPC bridge (40+ commands)
├─────────────────────────────┤
│   Engine Layer              │
│   ├── Cache (3-tier LRU)    │ ← Hot 512 / Warm 4K / Cold 16K
│   ├── Budget                │ ← Daily cap, Flash priority
│   ├── Tools (parallel+fix)  │ ← 6 built-in tools w/ auto-repair
│   ├── MCP Client            │ ← Stdio + HTTP JSON-RPC
│   ├── Agent (state machine) │ ← Idle→Thinking→Responding→Error
│   ├── Tick Engine           │ ← Heartbeat, task stack, reminders
│   └── Speculative Injector  │ ← Pre-fetch intent/pattern/knowledge
├─────────────────────────────┤
│   Memory Layer              │
│   ├── 7-category tagging    │ ← Skill/Preference/Knowledge/...
│   ├── fastembed (384d vec)  │ ← all-MiniLM-L6-v2 semantic search
│   ├── Recognizer → Injector │ ← Context injection pipeline
│   └── Writer (auto-store)   │ ← Post-conversation memory capture
├─────────────────────────────┤
│   DeepSeek API              │ ← Flash/Pro, streaming, R1 CoT
└─────────────────────────────┘
```

## Features

| Capability | Status |
|-----------|--------|
| 💬 Chat (streaming, SSE) | ✅ |
| 🧠 R1 Chain-of-Thought display | ✅ |
| 💾 Memory (7-category + vector) | ✅ |
| ⏱ TICK time sense (heartbeat) | ✅ |
| ⏰ Reminders + system notifications | ✅ |
| 📋 Interruptible task stack | ✅ |
| 🔮 Speculative pre-injection | ✅ |
| ☕ MCP client (Stdio + HTTP) | ✅ |
| 💵 Cost control (daily budget, Flash priority) | ✅ |
| 🗃 3-tier semantic cache (Hot/Warm/Cold) | ✅ |
| 🛠 Parallel tool execution + auto-repair | ✅ |
| 🎨 ACUI v2 (glass, gradient, glow, motion) | ✅ |
| 🌍 Bailongma-style Earth startup animation | ✅ |
| 📊 Cost dashboard | ✅ |
| ⚙️ Settings (API key, model, temp, budget) | ✅ |
| ⬛ System tray (close-to-tray, double-click show) | ✅ |
| 🧪 38 frontend tests + 115 Rust tests | ✅ |
| 🔧 CI (Linux/Windows/macOS) | ✅ |

## Quick Start

```bash
# Install dependencies
npm install

# Set up DeepSeek API key (or in-app after launch)
# LongMa uses deepseek-v4-flash by default

# Development
npm run dev           # Vite dev server
npm run tauri dev     # Full Tauri dev with hot-reload

# Testing
npm test              # 38 frontend tests
cd src-tauri && cargo test  # 115 Rust tests

# Production build
npm run tauri build   # Output in src-tauri/target/release/bundle/
```

## Configuration

Config saved to `~/.longma/config.json`:

| Key | Default | Description |
|-----|---------|-------------|
| `api_key` | `""` | DeepSeek API key |
| `model` | `deepseek-v4-flash` | Flash (cheap) or Pro (powerful) |
| `temperature` | `0.7` | Response creativity |
| `max_tokens` | `4096` | Max response length |
| `daily_budget_usd` | `null` | Optional daily spending cap |
| `auto_compress` | `false` | Auto-compress long contexts |
| `prefer_flash` | `true` | Use Flash model when available |

## Key Design Decisions

### Cache-First Loop (inspired by Reasonix)
Three-tier LRU cache: Hot (512 entries, instant) → Warm (4096) → Cold (16384). Messages are built with a fixed-prefix + appended pattern maximizing DeepSeek's prefix cache. Typical hit rate: 85-95%.

### Memory-Driven Architecture (inspired by Bailongma)
Not context-window-dependent. Memory is the structural backbone: experiences, capabilities, tools, user profiles, and system prompts are all stored as typed memories. The Recognizer identifies relevant memories per-turn; the Injector adds them to the context window; the Writer persists new experiences.

### Parallel Speculation
On each user message, three pre-checks run in parallel (500ms timeout): intent classification (is this a code/search/memory query?), pattern recognition (repeat question?), and knowledge retrieval. Results are injected as system context before the API call.

## MCP Integration

LongMa supports the Model Context Protocol:

```json
// ~/.longma/config.json
{
  "mcp_servers": [
    {
      "name": "filesystem",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    }
  ]
}
```

Connect/disconnect servers at runtime through the MCP panel in the app.

## Project Structure

```
src/                          # React frontend
├── components/
│   ├── Chat/                 # MessageBubble, ChatView, MessageInput...
│   ├── Layout/               # Sidebar, BottomBar, MainLayout
│   ├── CostDashboard/
│   ├── Settings/
│   ├── Memory/               # MemoryPanel
│   ├── MCP/                  # MCP management panel
│   └── Tick/                 # TaskStackPanel, TickIndicator
├── design-system/            # ACUI v2: tokens, GlassPanel, GradientText...
├── stores/                   # Zustand: chat, session
└── test/                     # Vitest + React Testing Library

src-tauri/src/                # Rust engine
├── api/                      # DeepSeek client, config management
├── db/                       # SQLite (conversations, messages)
├── engine/
│   ├── agent.rs              # Session state machine
│   ├── cache.rs              # 3-tier LRU cache
│   ├── cost.rs               # Cost calculation
│   ├── budget.rs             # Daily budget tracker
│   ├── tools.rs              # Parallel tool execution + repair
│   └── mcp/                  # MCP client (Stdio + HTTP)
├── memory/                   # 7-category memory + fastembed
├── tick/                     # TICK time sense engine
├── speculative/              # Pre-fetch injection
└── tray/                     # System tray
```

## License

MIT
