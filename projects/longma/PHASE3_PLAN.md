# LongMa Phase 3 — Bailongma UI + Reasonix 融合

## Discovery

### Original Request
> "继续优化longma，还要结合bailongma的图形化界面和炫酷启动机制，并完美融合reasonix的特性。"

### 调研总结
- **Bailongma**（白龙马 Agent，肖远大）：MIT开源，v2.1.207，Windows桌面端98MB。「一切皆记忆」核心理念，三大机制 — 预判注入/时间感/持续运行。官网 bailongma.top，Next.js 极简设计，启动地球质检动画+渐进式揭示。ACUI（Agent-Centric UI）设计系统，品牌一致性高。
- **Reasonix**（8.2K stars ⭐，MIT，TypeScript+Ink TUI）：DeepSeek 前缀缓存工程化到极致。四大支柱 — 缓存优先循环(三区模型→85-95%命中)/工具调用修复(4种故障自动修复)/成本控制(Flash优先+自动压缩+失败升级)/R1思维链收割。成本约Claude Code的1/30。
- **LongMa 现状**：Phase 1 ChatMVP（Tauri 2 + React 19 + Rust/SQLite） + Phase 2 白龙马式Agent（记忆7层分类/TICK时间感/提醒任务栈/预判注入/系统托盘/fastembed语义搜索）。UI为自定义ACUI暗色设计系统，有基础启动动画。

### 关键融合策略
| 方向 | Bailongma风格 | Reasonix特性 | 融合方式 |
|------|--------------|-------------|---------|
| 启动动画 | 地球旋转+6阶段渐进揭示 | — | 实现3D地球Canvas动画+深度渐进式揭示 |
| UI升级 | ACUI品牌设计系统 | — | 补充渐变/发光/动效/排版/响应式增强 |
| 缓存循环 | — | 三区模型(hot/warm/cold) | 形式化Rust缓存优先循环引擎 |
| 工具调度 | — | 并行工具执行+4种故障修复 | Actor模型并行调度+修复管线 |
| MCP | — | MCP协议 | 实现MCP客户端连接外部工具 |
| R1 CoT | — | 思维链收割/展示 | R1模型模式→CoT提取+UI展示 |
| 成本控制 | — | Flash优先+自动压缩+升级 | 增强Cost Engine |
| 整体UI | 图形化桌面质感 | — | Animations/Transitions/Micro-interactions |

---

## Non-Goals
- 不实现移动端（Phase 2方向）
- 不实现全自托管Agent（保持DeepSeek API依赖）
- 不替换现有Rust引擎层（新增模块，不重构）
- 不在Phase 3实现Linux/Windows/macOS之外的平台

---

## Design Summary

Phase 3 将 LongMa 从"功能完整的Agent聊天桌面应用"升级为"拥有白龙马级图形界面 + Reasonix级缓存工程的正统桌面AI Agent"。

**UI侧**：以 Bailongma 官网的极简设计（类似Linear/Vercel）和地球启动动画为灵感，ACUI v2 增加渐变背景动画、磨砂玻璃效果、微交互动效、多阶段启动画面。

**引擎侧**：以 Reasonix 的三区缓存模型、并行工具调度、自动修复管线、R1 CoT收割为蓝本，在现有引擎上构建正式的缓存优先循环和工具执行系统。

**架构图**：
```
┌──────────────────────────────────────────────────────┐
│                   前端 (React)                        │
│  ┌─────────┐ ┌──────────┐ ┌──────┐ ┌────────────┐   │
│  │地球启动  │ │ACUI v2   │ │CoT   │ │工具调用    │   │
│  │动画      │ │组件库    │ │面板  │ │可视化      │   │
│  └─────────┘ └──────────┘ └──────┘ └────────────┘   │
│                    Tauri IPC                          │
├──────────────────────────────────────────────────────┤
│                   引擎 (Rust)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────┐ ┌────────────┐  │
│  │缓存优先   │ │工具调度   │ │MCP   │ │R1 CoT      │  │
│  │三区模型   │ │+修复管线  │ │客户端│ │收割器      │  │
│  └──────────┘ └──────────┘ └──────┘ └────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐  │
│  │成本控制   │ │记忆系统   │ │TICK/预判/托盘(已有)  │  │
│  │增强版     │ │(已有)    │ │                      │  │
│  └──────────┘ └──────────┘ └──────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## Tasks

### 1. 地球启动动画（Bailongma风格）

**Depends on**: none

**Files:**
- Create: `src/components/Onboarding/EarthSplashScreen.tsx`
- Modify: `src/App.tsx`
- Create: `public/earth-bg.jpg` (静态占位背景)

**What to do**:
- Step 1: 分析 Bailongma 启动动画机制（地球自转质检动画+渐进式揭示阶段）
- Step 2: 实现 Canvas 3D 地球旋转动画
  - 使用 Canvas 2D 模拟球体旋转（无 Three.js 依赖，保持小体积）
  - 经纬网格线 + 大气辉光效果
  - 自转动画循环（requestAnimationFrame）
- Step 3: 实现6阶段渐进式揭示（每个阶段1.5秒，带淡入动画）
  - 「Initializing neural engine...」→「Loading memory vectors...」→「Calibrating time sense...」→「Connecting to DeepSeek...」→「Warming cache...」→「Ready」
- Step 4: 每个阶段带进度条+状态圆点指示器
- Step 5: 完成后保持 Ready 状态1秒，然后无缝过渡到主界面（淡出-切入）
- Step 6: 添加全局键盘快捷键：按任意键跳过启动动画
- Step 7: 修改 App.tsx 替换旧 SplashScreen 为 EarthSplashScreen

```typescript
// 核心动画结构
export default function EarthSplashScreen({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Canvas 2D 绘制地球经纬线+自转
  // 6阶段状态机: 每段1.5s + 0.5s过渡
  // requestAnimationFrame 循环
  // 完成后 onComplete()
}
```

**Must NOT do**:
- 不添加 Three.js/r3f 依赖（保持~50MB bundle）
- 不降低启动性能（Canvas 在空闲时 requestIdleCallback）
- 不阻塞 Tauri window 初始化

**References**:
- `src/components/Onboarding/SplashScreen.tsx` — 当前启动画面（替换目标）
- Bailongma bailongma.top 官网 — 地球动画灵感来源

**Verify**:
- [ ] Run: `npx tsc --noEmit` → 0 errors
- [ ] Run: `npm run build` → success
- [ ] Canvas 渲染帧率 > 30fps（CPU限帧）

---

### 2. ACUI v2 设计系统增强（Bailongma质感升级）

**Depends on**: 1

**Files:**
- Modify: `src/design-system/tokens.ts`
- Modify: `src/design-system/global.css`
- Modify: `src/design-system/theme.tsx`
- Modify: `src/design-system/Button.tsx`
- Modify: `src/design-system/Card.tsx`
- Create: `src/design-system/GlassPanel.tsx`
- Create: `src/design-system/GradientText.tsx`
- Create: `src/design-system/MicroAnimation.tsx`

**What to do**:
- Step 1: 增强 tokens.ts — 添加渐变/玻璃效果/动画变体
  ```typescript
  export const tokens = {
    // ... 现有 tokens
    gradients: {
      accentGradient: 'linear-gradient(135deg, #4f6fff 0%, #7c3aed 100%)',
      subtleGradient: 'linear-gradient(180deg, rgba(79,111,255,0.05) 0%, transparent 100%)',
      glowGradient: 'radial-gradient(circle at 50% 0%, rgba(79,111,255,0.1) 0%, transparent 70%)',
    },
    glass: {
      background: 'rgba(22, 27, 34, 0.6)',
      blur: '12px',
      border: 'rgba(255,255,255,0.06)',
    },
    animation: {
      // 补充 spring/physics-based 动画
      spring: '500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      bounce: '600ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  };
  ```
- Step 2: 创建 GlassPanel 组件 — 磨砂玻璃效果容器（backdrop-filter: blur + semi-transparent bg + subtle border）
- Step 3: 创建 GradientText 组件 — 渐变色文字 + 动画光效
- Step 4: 创建 MicroAnimation 组件集 — hover缩放/点击涟漪/渐变移动/加载骨架屏
- Step 5: 升级 Button — 添加 glass variant + gradient variant + hover 微动效
- Step 6: 升级 Card — 添加 elevated+glass variant + hover lift 动画（3D transform）
- Step 7: 更新 global.css — 添加背景动画渐变 + 磨砂滚动条 + 光效 keyframes
- Step 8: 更新 theme.tsx — 支持 gradient/glass 主题层

**Must NOT do**:
- 不添加 Tailwind/framer-motion 等大依赖
- 不破坏现有组件接口（纯新增 variant）
- 不过度设计（每个组件≤300行）

**Verify**:
- [ ] Run: `npx tsc --noEmit` → 0 errors
- [ ] Run: `npm run build` → success
- [ ] 现有组件（Button/Card）完全向后兼容

---

### 3. 缓存优先循环 — 三区模型（Reasonix核心）

**Depends on**: none

**Files:**
- Create: `src-tauri/src/engine/cache.rs`
- Create: `src-tauri/src/engine/cache_priority.rs`
- Modify: `src-tauri/src/engine/mod.rs`
- Modify: `src-tauri/src/api/deepseek.rs`

**What to do**:
- Step 1: 实现三区缓存语义模型
  ```rust
  pub enum CacheZone {
      Hot,   // 当前会话上下文（连续前缀 → 最高命中率）
      Warm,  // 近期活跃会话、系统提示词模板
      Cold,  // 历史记忆、知识库
  }
  
  pub struct CacheStrategy {
      zone: CacheZone,
      priority: u8,        // 0-100
      max_context_ratio: f32,  // 该区占上下文比例
      ttl: Duration,
  }
  ```
- Step 2: 实现 CachePriorityEngine
  - 维护 Hot Zone：当前对话消息列表（LLM顺序保持）
  - 维护 Warm Zone：会话系统提示词 + 最近N条历史 + 当前记忆注入
  - 维护 Cold Zone：检索到的向量记忆（fastembed）
  - 按 zone 优先级构建消息序列：System(Warm) → History(Warm) → Current(Hot) → Memories(Cold)
- Step 3: 在 build_messages 中集成三区模型
  - 当前已实现的 build_messages 保持固定前缀（系统提示词）
  - Warm Zone：注入高频记忆 + 用户画像信息
  - Hot Zone：保持当前对话上下文不变
  - Cold Zone：fastembed 语义检索 Top-K
- Step 4: 添加缓存命中追踪
  - 记录每轮构建中 hot/warm/cold 各自的 token 数
  - 通过 Tauri 事件发送到前端统计

**Must NOT do**:
- 不要改变 chat_stream interface（向后兼容）
- 不要阻塞消息发送（缓存构建同步但轻量）

**References**:
- `src-tauri/src/engine/agent.rs` — 现有Session状态机
- `src-tauri/src/api/deepseek.rs:build_messages` — 当前消息构建函数
- Reasonix: prefix caching three-zone model

**Verify**:
- [ ] Run: `cargo check` → 0 errors
- [ ] existing `build_messages` unchanged API
- [ ] three-zone model compiles and builds messages correctly

---

### 4. 并行工具调度 + 自动修复管线（Reasonix核心）

**Depends on**: 3

**Files:**
- Create: `src-tauri/src/engine/tool_dispatcher.rs`
- Create: `src-tauri/src/engine/tool_registry.rs`
- Create: `src-tauri/src/engine/tool_types.rs`
- Modify: `src-tauri/src/engine/mod.rs`
- Modify: `src-tauri/src/lib.rs`

**What to do**:
- Step 1: 定义工具系统类型
  ```rust
  pub struct ToolDefinition {
      pub name: String,
      pub description: String,
      pub parameters: Vec<ParameterDef>,
      pub handler: fn(ToolCall) -> Result<ToolResult, ToolError>,
      pub timeout_ms: u64,
      pub retry_config: RetryConfig,
  }
  
  pub enum ToolError {
      Timeout,
      ExecutionFailed(String),
      RateLimited,
      InvalidParameters(String),
  }
  
  pub struct RetryConfig {
      pub max_retries: u32,
      pub backoff_ms: u64,
      pub fallback: Option<String>, // fallback tool name
  }
  ```
- Step 2: 实现 ToolRegistry — 工具定义注册表，支持注册/查找/列出工具
- Step 3: 实现 ToolDispatcher — 并行调度引擎
  - 维护工具调用队列（ConcurrentQueue）
  - 并行执行独立工具调用（tokio::spawn + JoinSet）
  - 超时控制（per-tool timeout_ms）
  - 结果聚合（等待全部完成或任一失败）
- Step 4: 实现4种故障处理模式（Reasonix对齐）
  - **Timeout** → 重试1次（backoff 500ms）→ 失败则跳过 + 报告
  - **ExecutionFailed** → 重试2次（exponential backoff）→ 失败则 fallback 工具
  - **RateLimited** → 等待后重试（Retry-After header）→ 最多3次
  - **InvalidParameters** → 不重试（根本性问题），报告错误
- Step 5: 实现基础内置工具
  - `read_file(path)` — 读取文件内容
  - `search_memory(query)` — 搜索记忆系统
  - `web_fetch(url)` — 获取网页（调用现有 speculative::injector::warmup_knowledge）
  - `calculate(expression)` — 简单数学计算
- Step 6: 注册 Tauri 命令
  - `execute_tools(tools: Vec<ToolCall>)` → 返回 `Vec<ToolResult>`
  - `list_available_tools()` → 返回工具列表
- Step 7: 修改 lib.rs 注册新命令和启动时初始化工具注册表

**Must NOT do**:
- 不在 Phase 3 实现 MCP 连接（Task 5单独）
- 不引入 tokio::task::spawn_blocking 性能问题

**Verify**:
- [ ] Run: `cargo check` → 0 errors
- [ ] Unit test: tools execute in parallel
- [ ] Unit test: timeout → retry → fallback flow
- [ ] Unit test: rate limited → backoff → success

---

### 5. MCP 客户端集成

**Depends on**: 4

**Files:**
- Create: `src-tauri/src/engine/mcp_client.rs`
- Create: `src-tauri/src/engine/mcp_types.rs`
- Modify: `src-tauri/src/engine/mod.rs`
- Modify: `src-tauri/src/lib.rs`

**What to do**:
- Step 1: 实现 MCP 协议类型（JSON-RPC 2.0 子集）
  ```rust
  pub struct MCPToolDefinition {
      pub name: String,
      pub description: String,
      pub input_schema: serde_json::Value,
  }
  
  pub struct MCPClient {
      pub name: String,
      pub transport: MCPTransport,
      pub tools: Vec<MCPToolDefinition>,
  }
  
  pub enum MCPTransport {
      Stdio { command: String, args: Vec<String> },
      Http { url: String, headers: HashMap<String, String> },
  }
  ```
- Step 2: 实现 Stdio MCP 连接（JSON-RPC over stdin/stdout）
  - 启动子进程（tokio::process::Command）
  - JSON-RPC 2.0 initialize/list_tools/call_tool
  - SSE 或 line-based 通信
- Step 3: 实现 MCP 工具 → 内部工具适配器
  - 将已注册的 MCP 工具包装为 ToolDefinition
  - 注册到 ToolRegistry
- Step 4: 配置 MCP 服务器（JSON 配置）
  - 从 ~/.longma/mcp_config.json 读取 MCP 服务器配置
  - 支持 stdio/http transport
- Step 5: 添加 Tauri 命令
  - `list_mcp_servers()` → 返回已连接 MCP 服务器列表
  - `connect_mcp_server(config)` → 动态连接 MCP
  - `disconnect_mcp_server(name)` → 断开连接

**Must NOT do**:
- 不实现完整 MCP 规范（仅 agent-native 子集）
- 不在 UI 层处理 MCP 连接逻辑

**Verify**:
- [ ] Run: `cargo check` → 0 errors
- [ ] Integration: 连接本地 MCP echo server 成功
- [ ] Integration: call_tool 返回正确结果

---

### 6. R1 思维链收割（Reasonix Core Feature）

**Depends on**: 3

**Files:**
- Create: `src-tauri/src/engine/cot_harvester.rs`
- Modify: `src-tauri/src/engine/mod.rs`
- Modify: `src-tauri/src/api/deepseek.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/stores/chat.ts`
- Modify: `src/components/Chat/ChatView.tsx`
- Create: `src/components/Chat/CoTPanel.tsx`
- Modify: `src/App.tsx`

**What to do**:
- Step 1: Rust 端 — 解析 R1 CoT tokens
  - DeepSeek R1 响应格式：`[thinking]...CoT content...[/thinking]` 或 `reasoning_content` 字段
  - CoT Harvester 解析 SSE 流中的 reasoner 输出
  - 分离 CoT 内容 和 最终回复内容
  - 统计 CoT token 消耗
- Step 2: Tauri 命令 + 事件
  - 在 chat_stream 中添加 coT_channel: tokio::sync::broadcast
  - 发送 `chat-chunk` 事件时携带 `cot_content` 字段
- Step 3: 前端 chat store 扩展
  - 添加 CoT 内容追踪（cotContent / accumulatedCot）
  - 在流式接收时分离 CoT
- Step 4: 创建 CoTPanel 组件
  - 可折叠/展开的思维链面板（在消息气泡下方）
  - 深灰底 + 等宽字体显示 CoT
  - 「Show thinking」/「Hide thinking」切换按钮
  - 仅在 R1 模型时显示
- Step 5: 修改 ChatView 集成 CoTPanel
  - 当模型为 deepseek-reasoner 时，每条 assistant 回复显示 CoT
- Step 6: Cost tracking 增强
  - CoT tokens 单独统计（R1 CoT 免费 → 影响缓存策略）

**Must NOT do**:
- 不默认展开 CoT（用户需点击「Show thinking」）
- 不混入 CoT 到最终回复文本

**Verify**:
- [ ] Run: `cargo check` → 0 errors
- [ ] Run: `npm run build` → success
- [ ] CoT 内容正确分离（不污染 final response）

---

### 7. 成本控制增强（Reasonix Cost Control）

**Depends on**: 3

**Files:**
- Modify: `src-tauri/src/engine/cost.rs`
- Modify: `src-tauri/src/engine/cache.rs`
- Modify: `src-tauri/src/api/config.rs`
- Modify: `src/stores/session.ts`
- Modify: `src/components/CostDashboard/CostDashboard.tsx`

**What to do**:
- Step 1: 实现 Flash 优先策略
  - 默认使用 deepseek-v4-flash（已在 config）
  - 仅当用户明确要求或复杂推理时才切换到 Pro
  - 添加 auto_model_selection 配置项
- Step 2: 实现自动上下文压缩（Context Budget）
  - 当消息列表 token 数超过阈值时自动压缩
  - 压缩策略：移除早期低价值消息 → 摘要历史 → 截断
  - ContextBudget 结构：`{ soft_limit, hard_limit, compression_strategy }`
- Step 3: 实现失败升级策略
  - Flash 调用失败 → 自动升级到 Pro 重试
  - Pro 调用失败 → 降级回 Flash 并报错
  - FallbackChain：`[Flash, Pro]` 自动尝试
- Step 4: 前端成本仪表盘增强
  - 添加「节省对比」区域（如果全部用Pro需付多少钱 vs 实际）
  - Flash/Pro 切换时的成本预估
  - 缓存命中率实时显示 + 历史趋势
- Step 5: 添加模型自动切换策略配置界面
  - 设置页添加「自动模型选择」toggle
  - Flash-First / Quality-First / Manual 三种模式

**Must NOT do**:
- 不修改现有 chat_stream API（纯增强）
- 不默认压缩用户最后一条消息

**Verify**:
- [ ] Run: `cargo check` → 0 errors
- [ ] Run: `npm run build` → success
- [ ] Test: Flash 优先构建消息正确
- [ ] Test: 失败升级逻辑正确

---

### 8. 图形界面整体升级（Bailongma风格 ACUI v2）

**Depends on**: 1, 2

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Layout/Sidebar.tsx`
- Modify: `src/components/Layout/BottomBar.tsx`
- Modify: `src/components/Layout/MainLayout.tsx`
- Modify: `src/components/Chat/MessageBubble.tsx`
- Modify: `src/components/Chat/MessageInput.tsx`
- Modify: `src/components/Chat/ChatView.tsx`
- Modify: `src/components/Chat/ConversationList.tsx`
- Modify: `src/design-system/global.css`
- Create: `src/design-system/animations.css`

**What to do**:
- Step 1: 创建 animations.css — 全局动画系统
  - `fadeIn`/`fadeInUp`/`fadeInScale` — 入场动画
  - `shimmer` — 光效扫描动画（用于骨架屏/加载态）
  - `float` — 悬浮动画（用于AI状态指示器）
  - `glowPulse` — 光芒脉冲（用于 accent 强调）
- Step 2: Sidebar 升级
  - 添加渐变背景底部光效
  - Logo 区域增加微动画（渐变流动）
  - 对话列表项 hover 微缩放 + 玻璃效果
  - 选中项渐变左边框指示器
- Step 3: ChatView 升级
  - 空态欢迎页：渐变背景动画 + 发光Logo + 打字机式副标题
  - 消息区域：柔和渐变背景分隔
  - 建议问题按钮：hover 提升效果 + 玻璃质感
- Step 4: MessageBubble 升级
  - 用户气泡：渐变蓝底 + 微发光
  - AI 气泡：暗灰半透明玻璃效果
  - Token 信息：鼠标悬停浮现
  - 头像：全息渐变圆角icon
- Step 5: MessageInput 升级
  - 输入框：聚焦时外围发光（accent glow）
  - 底部工具栏：model徽章+发送按钮+玻璃面板
  - 字符数/成本实时提示
- Step 6: BottomBar 升级
  - 模型徽章渐变边框 + 脉冲动画
  - Token 数据的图表化进度指示
  - 缓存命中率圆形指示器
- Step 7: MainLayout 升级
  - 背景渐变动态壁纸（subtle gradient animation）
  - 滚动条磨砂玻璃风格
  - 窗口 resize 平滑过渡
- Step 8: ConversationList 升级
  - 切换视图动画（slide 过渡 + fade）
  - 面板切换时内容淡入淡出
- Step 9: 全局动画启用/禁用设置
  - Settings 添加「减少动画」选项
  - respects prefers-reduced-motion

**Must NOT do**:
- 不替换现有 React 组件（纯升级）
- 不过度设计（保持暗色沉稳基调）
- 不添加 auto-playing 视频/GIF

**Verify**:
- [ ] Run: `npx tsc --noEmit` → 0 errors
- [ ] Run: `npm run build` → success
- [ ] All existing UI still functional
- [ ] prefers-reduced-motion 正确禁用动画

---

## 执行计划

### 执行顺序
```
Task 1 (地球启动动画) → 并行: Task 3 (三区缓存) + Task 4 (工具调度)
    ↓
Task 2 (ACUI v2) —— 依赖 Task 1 完成后
    ↓
Task 5 (MCP) —— 依赖 Task 4
    ↓
Task 6 (R1 CoT) —— 依赖 Task 3
    ↓
Task 7 (成本控制增强) —— 依赖 Task 3
    ↓
Task 8 (整体UI升级) —— 依赖 Task 1+2
```

### 并发策略
- **Wave 1** (并行): Task 1 (前端) + Task 3 (Rust) + Task 4 (Rust)
- **Wave 2** (并行): Task 2 (前端, 依赖1) + Task 6 (Rust, 依赖3) + Task 7 (Rust, 依赖3)
- **Wave 3**: Task 5 (Rust, 依赖4)
- **Wave 4**: Task 8 (前端, 依赖1+2)
