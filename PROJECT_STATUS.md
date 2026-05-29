# LongMa — Project Status

> 专为 DeepSeek 模型优化的桌面伴侣型 AI Agent

## Phase 1: Chat MVP ✅
Tauri v2 + React 19 + DeepSeek API + SQLite + ACUI 设计系统 + Chat UI + Cost Dashboard + Startup 动画

## Phase 2: 白龙马 Agent 引擎 ✅
- 7层记忆系统 (SQLite tag 检索 + 识别→注入→写入)
- TICK 时间感 (Idle 20min / Active 30s / Task 5s)
- 提醒 + 任务栈 (SQLite + 系统通知 + 可打断)
- 预判注入 (意图/模式/知识三路并行 + 500ms 超时)
- 系统托盘 (右键菜单 + 关窗隐藏 + 双击唤出)
- UI 集成 (MemoryPanel / TickIndicator / TaskStackPanel)

## Phase 2.1: 语义搜索 ✅
- fastembed 5 + all-MiniLM-L6-v2 (384维)
- 混合检索 (tag + cosine similarity)

## Phase 3: Bailongma + Reasonix 融合 ✅
- 地球启动动画 (Canvas 2D 模拟 3D)
- ACUI v2 玻璃态设计系统
- 缓存优先三区模型 (Hot 512 / Warm 4096 / Cold 16384 LRU)
- 并行工具调度 + 4种故障修复
- MCP 客户端 (Stdio + HTTP 双传输)
- R1 思维链收割 (CoT 分离 + 可折叠面板)
- 成本控制增强 (每日预算 / Flash 优先 / 自动压缩)
- 整体 UI 升级 (Toast / GlassPanel / 微交互动效)

## Phase 4: 基础设施加固 ✅
- **Unit Tests**: 115 tests across 9 modules (memory, engine, tick, speculative, api)
- **Dead Code Cleanup**: 34→0 warnings (pub API types suppressed where intentional)
- **Transport Fix**: StdioTransport struct corrected to match actual field usage
- **Build Profiles**: `cargo check` 0 errors/warnings, `npm run build` clean

## CI ✅
- GitHub Actions: Linux (.deb + .AppImage) / Windows (.msi + .exe) / macOS (.dmg)
- GitHub: https://github.com/guish7423/longma

## Current Artifacts
- Linux release binary: ~50MB (含 ONNX runtime)
- Frontend: 56 modules, 282KB JS + 4.76KB CSS, ~1.65s build
- Rust: 34 source files, 115 unit tests (0.02s runtime)

## Next Candidates
| Area | Priority | Description |
|------|----------|-------------|
| Frontend Tests | High | Vitest + React Testing Library for 30 components |
| Clippy Cleanup | Medium | `cargo clippy` idiom pass |
| E2E Verification | High | Real app launch + chat flow test |
| Documentation | Low | README refresh, architecture docs |
| Performance | Low | Binary size audit, startup time optimization |
