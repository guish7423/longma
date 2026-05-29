# LongMa — Project Status

> 专为 DeepSeek 模型优化的桌面伴侣型 AI Agent
> GitHub: https://github.com/guish7423/longma
> 最后更新: 2026-05-29 — 6项BaiLongma体验差距全部修复

## Phase 1: Chat MVP ✅
Tauri v2 + React 19 + DeepSeek API + SQLite + ACUI 设计系统 + Chat UI + Cost Dashboard + Startup 动画 (8/8 tasks)

## Phase 2: 白龙马 Agent 引擎 ✅
7层记忆系统 / TICK 时间感 / 提醒+任务栈 / 预判注入 / 系统托盘 / UI 集成 (9/9 tasks)

## Phase 2.1: 语义搜索 ✅
fastembed 5 + all-MiniLM-L6-v2 (384维), 混合检索 (9/9 tasks)

## Phase 3: Bailongma + Reasonix 融合 ✅
地球动画 / ACUI v2 / 三区缓存 / 工具调度+修复 / MCP客户端 / R1思维链 / 成本控制 / UI升级 (8/8 tasks)

## Phase 4: 基础设施加固 ✅
- 115 Rust 单元测试 (9模块覆盖) 
- 34→0 dead_code warnings
- anyhow 错误类型化
- task_stack.rs Mutex 安全加固

## Phase 5: E2E + 前端测试 + 文档 ✅
- chat.ts 集成预算检查/缓存/TICK/成本追踪
- chat_stream 后端预算检查
- Vitest + RTL 38 前端测试
- README 完善 + CI 测试步骤

## Phase 6: Windows 原生打包 ✅
- NSIS 安装器配置
- tauri-updater 插件
- GitHub Release 三平台自动构建
- ZIP 绕过 SmartScreen 方案

## BaiLongma 功能全面复制 ✅ (10/10 tasks)
- **Task 1**: 多 Provider LLM (DeepSeek/OpenAI/Anthropic)
- **Task 2**: 音乐播放器 (rodio 引擎 + HTML5 视频)
- **Task 3**: 视频播放器 (HTML5 `<video>`)
- **Task 4**: 语音 ASR+TTS (Web Speech API)
- **Task 5**: 热点面板 (GitHub/HN/Reddit/知乎/微博)
- **Task 6**: 天气卡片 (wttr.in API)
- **Task 7**: 人物卡片 (4角色: Assistant/Coder/Writer/Scholar)
- **Task 8**: 社交分发 (Discord/WeChat/Telegram)
- **Task 9**: 系统资源监控 (sysinfo: CPU/内存/磁盘)
- **Task 10**: UI 框架 + 导航 (10个view路由)

## 已知差距 (待修复)
| # | 问题 | 原因 | 方案 |
|---|------|------|------|
| 1 | 启动动画不展示 | SplashScreen 可能被 phase 状态跳过 | 检查 App.tsx phase 逻辑 |
| 2 | 语音不工作 | Web Speech API 需 HTTPS 安全上下文, Tauri file:// 不可用 | Rust TTS 替代 (tts-rs/cpal) |
| 3 | 无系统自检面板 | 从未构建此功能 | 新建 HealthPanel |
| 4 | 音乐路径硬编码 | PlayerPanel 使用 WSL 绝对路径 | 文件选择器 + 默认资源 |
| 5 | 无开机自动行为 | 无 auto-start 逻辑 | 启动时自动播放默认内容 |
| 6 | 缺少开箱即用精致感 | 多个小问题累积 | DeepSeek 深度集成优化 |

## 技术栈
- **前端**: React 19 + TypeScript + Vite 6 + Zustand 5
- **桌面**: Tauri v2
- **后端**: Rust (reqwest, rusqlite, tokio, rodio, sysinfo, fastembed)
- **存储**: SQLite + fastembed 语义向量 (384维 all-MiniLM-L6-v2)
- **测试**: Rust 单元测试 (115) + Vitest + RTL (38)
- **CI**: GitHub Actions (Linux/Windows/macOS 三平台)
- **大小**: ~50MB binary (含 ONNX runtime)

## 构建状态
- TypeScript: 0 errors
- Rust: 0 errors, 0 warnings
- Tests: 153 all pass
- Vite: ~1.1s build, 65 modules, 344KB JS

## BaiLongma体验差距修复 (2026-05-29)
1. ✅ Splash动画增强: 7阶段6.2s, 极光星云+渐变色标题+ESC跳过
2. ✅ 语音系统: Rust TTS引擎(espeak/say/PowerShell) + VoicePanel双模式
3. ✅ 系统自检: HealthPanel(CPU/内存/磁盘/版本/API/TTS/缓存状态)
4. ✅ 文件选择: Tauri dialog替代硬编码路径
5. ✅ 引导增强: 10条cycling tips + 5条建议问题
6. ✅ 整体抛光: 空态/错误处理/视觉统一
