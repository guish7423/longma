# LongMa Project Status

## Session: 2026-05-28 — Phase 1 + Phase 2 + Phase 2.1 全部完成

### Current State
All phases complete. LongMa is a fully functional DeepSeek-native desktop AI Agent companion.

### Completed
- **Phase 1 MVP** (8/8 tasks): Tauri+React+Rust scaffold, DeepSeek API, SQLite memory, Cost engine, ACUI design, Chat UI, Cost dashboard, Startup+Settings
- **Phase 2 Agent** (9/9 tasks): Memory system (7-layer), TICK time sense, reminders + task stack, speculative injection (intent/pattern/knowledge), system tray background agent, UI integration (MemoryPanel/TickIndicator/TaskStackPanel)
- **Phase 2.1**: Vector embeddings (fastembed v5.14.0, all-MiniLML6V2, 384-dim, SQLite BLOB storage)

### Build Artifacts
- Binary: 50MB (release, includes ONNX runtime)
- DEB: 6.8MB / RPM: 7.2MB / AppImage: 25MB
- Frontend: 54 modules, ~253KB gzipped JS
- TS: 0 errors / Rust: 0 errors (18 dead_code warnings)

### Architecture
```
React UI (Chat/Cost/Memory/Tick/Settings)
  → Tauri IPC (invoke + events)
    → Rust Engine
      ├─ api/         DeepSeek API client + config
      ├─ db/          SQLite store
      ├─ engine/      Session state machine + cost
      ├─ memory/      Store + Recognizer + Injector + Writer + Embedding
      ├─ tick/        TICK engine + Reminder + TaskStack
      ├─ speculative/ Pre-execution analysis (intent/pattern/knowledge)
      └─ tray/        System tray handler
```

### Technical Decisions
- Embedding: fastembed-rs with all-MiniLM-L6-v2, downloads ~23MB model on first use
- Memory: Hybrid search (tag + semantic cosine similarity)
- TICK: tokio::spawn background loop with dynamic interval (20min/30s/5s)
- Speculative: 500ms timeout, silent degradation

### Known Issues
- 18 dead code warnings (all from forward-looking modules, expected)
- Embedding model downloads on first `write_memory` call (23MB, ~30s)
- No automated tests yet
- identifier warning in tauri.conf.json (ends with .app)

### Next Phase Options
1. **Phase 3: Quality** — Tests, CI/CD, fix warnings, integration tests
2. **Android Phase 2.5** — Plan mobile AI agent system
3. **Windows build** — Cross-compile for Windows
4. **Feature polish** — Real-time memory injection in chat, memory strength visualization
