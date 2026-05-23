---
description: OpenCode workspace root configuration
---

---

## 指令层级说明

本文件（Layer 3·工作区级）与全局 AGENTS.md（Layer 2·用户级）组成双层指令体系：
- **Layer 3（本文件）**：工作区特定规则，最高优先级
- **Layer 2（`~/.config/opencode/AGENTS.md`）**：跨会话通用规则
- **Layer 1（`~/.config/opencode/opencode.json`）**：配置声明

当 Layer 3 与 Layer 2 冲突时，Layer 3 优先。
跨会话资源使用规范、技能体系、MCP 配置等通用内容已迁移至 Layer 2。

# File Placement Rules

All files generated or modified MUST obey these rules:

## Allowed write zones
| Zone | Path | Purpose |
|------|------|---------|
| **Novels** | `~/.opencode-workspace/projects/novels/` | InkOS 网文创作项目 |
| **Workspace** | `~/.opencode-workspace/` | All session output, AGENTS.md, temp files |
| **OpenClaw projects** | `~/.openclaw/` | Only when explicitly modifying OpenClaw components |
| **OpenCode user config** | `~/.config/opencode/opencode.json` | Only with user permission |

## Forbidden zones (NEVER write here unless user explicitly asks)
- `~/` (home root) — no files, no directories
- `~/Desktop/`, `~/Downloads/`, `~/Documents/` etc.
- Any dotfile at home root (`.xxx`) unless it already exists and needs modification

## Cleanup rules
- Temp/test projects → always `~/.opencode-workspace/tmp/`
- Large log files → always inside the relevant project dir, not home root
- Reports → always `~/.opencode-workspace/reports/`

---

# Project Registry
## Knowledge Graph (双层架构)

Code understanding + cross-session memory, replacing old half-broken graphiti:
- **codegraph** (@colbymchenry/codegraph v0.9.3) — MCP server, tree-sitter + SQLite, zero external deps. Code understanding, semantic search, dependency graph
- **agentmemory** (@agentmemory/agentmemory) — MCP server, BM25 + vector + knowledge graph RRF fusion, 51 tools, auto-capture
- MCP endpoints: codegraph (port 5740) + agentmemory (port 3111)
- Usage: `codegraph init -i` in project dir to index, agentmemory auto-captures sessions

## Music Source Configuration

OpenClaw has been configured to use **lx-music-desktop** from https://github.com/lyswhut/lx-music-desktop as the primary music source, replacing the previous 小汪音乐V5 plugin.

### Configuration
- Plugin: `music-openclaw` at `~/.openclaw/music-openclaw/`
- Music Source: **NeteaseCloudMusicApi + mpv** (not LX Music direct)
- API Server: `http://localhost:3000` (NeteaseCloudMusicApi)
- Audio Output: `mpv` → PulseAudio → RDPSink → Windows
- Desktop App: LX Music (for UI browsing, runs separately if needed)
- Status: ✅ **Working**

### Installation
- NeteaseCloudMusicApi: `/home/guish/.npm-global/bin/NeteaseCloudMusicApi`
- LX Music Desktop: `/opt/lx-music-desktop/` (v2.12.2)
- Start NeteaseCloudMusicApi: `/home/guish/.npm-global/bin/NeteaseCloudMusicApi &`
- Audio test: `mpv --no-video --audio-device=pulse/RDPSink <url>`

### Usage
1. Launch: `lx-music-desktop` (CLI) or via desktop launcher
2. Enable Open API: Settings → 开放 API → 启用
3. Default API Port: 9000

### WSL2 Patches (Required for GPU + Audio)

LX Music requires two patches to run in WSL2:

#### 1. GPU Rendering Patch (app.asar)
- **Root cause**: LX Music forces `--use-gl=desktop` on Linux (line 35244 of main.js), which fails in WSL2 due to missing desktop OpenGL
- **Fix**: Patched `app.asar` to use `--use-gl=angle --use-angle=vulkan` instead, leveraging bundled SwiftShader Vulkan software renderer
- **Patched file**: `/opt/lx-music-desktop/resources/app.asar`
- **Backup**: `/opt/lx-music-desktop/resources/app.asar.bak`
- **Patch source**: `/tmp/lx-extracted/dist/main.js` (line 35244-35245)
- **⚠️ Warning**: Package updates will overwrite the patched asar — must re-apply after `apt upgrade`

#### 2. Audio + Launch Wrapper
- **Root cause**: LX Music defaults to PipeWire (Dummy Output) instead of PulseAudio RDPSink
- **Fix**: Wrapper script at `/usr/local/bin/lx-music-desktop` sets `PULSE_SERVER=unix:/mnt/wslg/PulseServer` and passes `--no-sandbox`
- **Audio route**: LX Music → PulseAudio → RDPSink → Windows audio
- **⚠️ Warning**: Package updates may replace the wrapper — must re-create after `apt upgrade`

### Migration Notes
- The 小汪音乐V5 directory exists in `.openclaw/` for reference
- New music functionality is provided through the integrated lx-music-desktop source
- All 小汪音乐V5 files have been removed from the plugins directory


---

## InkOS Novel Projects

| 目录 | 项目名 | 书籍 | 章节 | 状态 |
|------|--------|------|------|------|
| `projects/novels/逆星印` | 逆星印 | 逆星印(玄幻) | 1章 | 未审计 |
| `projects/novels/剑墟` | 剑墟 | 剑墟(玄幻) | 1章 | 未审计 |
| `projects/novels/墨羽` | 墨羽 | 墨羽(玄幻) | **5章** ✅ | ready-for-review |

**墨羽**是完整测试项目：plan→compose→draft→audit→revise 全流程通过，
评分 8.8/10，已测试成功上传到番茄草稿箱。

### 完整工作流
```
InkOS 创作（inkos write next）
    ↓
import_from_inkos（导入到 MCP SQLite）
    ↓
check_originality（AI 原创检测）
    ↓
publish_chapter（API直连 → 番茄草稿箱）
```

|

## Active Development Projects（活跃开发项目）

| 目录 | 项目 | 远程仓库 | 状态 |
|------|------|---------|------|
| `projects/university-social/` | university-social | github.com/guish7423/university-social | ⚠️ 42 files modified (pc/) |
| `projects/chaoxing/` | chaoxing | Samueli924/chaoxing (rebuilt) | ✅ 稳定，上游补丁已应用 |
| `projects/huashu-design/` | huashu-design | — | HTML原型/动画框架，skills/huashu-design symlink |

|
Git-cloned 第三方参考（只读，必要时 git pull 同步）：
|
| 目录 | 项目 | 远程仓库 | 用途 |
|------|------|---------|------|
| `references/community/eyeson/` | eyeson | grzetich/eyeson | ORM-connected screenshot testing, MCP server |
| `references/community/pi-autocrit/` | pi-autocrit | adiun/pi-autocrit | Web novel AI critique (Python) |
| `references/community/sc-datav/` | sc-datav | knight-L/sc-datav | Vue3 data visualization |
|
非 git 静态数据集：
|
| 项目 | 路径 | 类型 |
|------|------|------|
| awesome-selfhosted | `references/datasets/awesome-selfhosted/` + root symlink | FOSS 自托管列表 |
| galaxy | `references/datasets/galaxy/` + root symlink | UI 组件库 (3800+) |
|
**结构规范**：社区参考项目统一做成 skill，放在 `~/.opencode-workspace/skills/<name>/`。
# 跨会话项目追踪 (Session Bootstrap)

## Session 启动（强制）
按顺序执行以下步骤：

1. **项目状态加载** — 读取当前项目 `.opencode/PROJECT_STATUS.md`（若有）
2. **历史经验召回** — `elf search query="<项目名>"` 加载 ELF 经验
3. **项目规则加载** — 读取 `.opencode/AGENTS.md`（若有）加载项目特定规则
4. **模型限制确认** — 当前仅可用 **deepseek v4 flash**（不要期待其他模型可用）
5. **阶段检测 + L0-L4 技能加载** — 执行 `hive_status()` 检测阶段：
   - **规划阶段**（无 plan/feature）→ 加载 L0·Meta: brainstorming, writing-plans
   - **执行阶段**（plan approved）→ 加载 L0·Meta: executing-plans, verification-before-completion
   - 检测到技术栈后 → 加载 L1·Domain 对应技能（golang/vue/frontend-design 等）
   - 活跃技能总量 ≤ 4
6. **MCP 就绪确认** — codegraph（代码理解）+ agentmemory（跨会话记忆）可用

## Session 结束（强制）
所有步骤必须执行，不可跳过：

1. **PROJECT_STATUS.md 更新** — 记录进度、完成项、已知问题、未完成决策
2. **ELF 经验保存** — `elf add-rule type=learning` 保存本次核心经验
3. **Golden Rule 提取** — 重复 >2 次的模式 → `elf add-rule type=golden_rule` 固化
4. **agentmemory 持久化** — `agentmemory_memory_save` 保存完整会话摘要（含关键决策、文件改动、工具发现）
5. **compress 上下文整理** — 已关闭的阶段压缩为摘要，保持上下文窗口锐利
---

# Karpathy Behavioral Guidelines

Derived from Andrej Karpathy's observations on LLM coding pitfalls.
Bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

## 3. Surgical Changes

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove imports/variables/functions that YOUR changes made unused.
- Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

- Transform tasks into verifiable goals with success criteria.
- For multi-step tasks, state a brief plan: `1. [Step] → verify: [check]`
- Strong success criteria let you loop independently.

---

# OpenCode Self-Configuration & Evolution

## Plugin Management
- Plugins declared in `~/.config/opencode/opencode.json` → `plugin` array
- Dependencies in `~/.config/opencode/package.json` → run `npm install` there
- All 27 active plugins across 7 categories: skill systems, orchestration, workflow/loop, git/worktree, context/session, quality/safety, tools/utils
- Memory: prefer `opencode-working-memory` (free, local, zero API calls)

## Agent System
- Custom agents: `~/.config/opencode/agents/*.md` (global) or `.opencode/agents/*.md` (project)
- Available: @self-evolve (session audit), Hive agents (Forager/Scout/Hygienic), @supervisor, @reviewer
- Pattern: Hive orchestrates planning → orchestration → review phases
- **已固化优先级梯队**：详见下方 §6 多Agent协作 & 编排优先级梯队

## ELF Memory
- `golden_rule`: Durable, cross-session rules
- `learning`: Session-specific lessons
- Store important decisions as golden_rules for future sessions

## Self-Improvement Loop (Evolve)

- Audit community → Identify gaps → Research → Implement → Store as ELF learnings
- Regular `elf search` at session start to load relevant past learnings

### Layer 1: Skills (knowledge)
- `self-improve` skill: triggers, decision tree, session-end checklist
- Create skills for new APIs/tools/workflows I need to remember

### Layer 2: Agents (active)
- `@self-evolve`: session audit, pattern extraction, update recommendations
- Run self-evolve at end of major sessions to extract learnings

### Layer 3: ELF Memory (durable)
- `golden_rule`: config patterns, tool gotchas, permanent rules
- `learning`: session-specific lessons, user feedback

### Layer 4: AGENTS.md (behavioral)
- This file: durable behavior rules that persist across sessions

### Layer 5: Auto-extensions (when skill/agent/rule insufficient)
- Plugins (event hooks) for system-level automation
- Custom tools for new callable functions
- MCP servers for complex external integrations

### Trigger Conditions (act immediately when)
- Command failed → document fix, update stale rules/skills
- New workflow found → add skill or update AGENTS.md
- Repeated task done twice → make it a reusable pattern
- User confirms approach → save as golden_rule
- Token waste found → update instructions to be more efficient
- Session ends → extract learnings to ELF before finishing

### Community-Driven Improvement
- Monitor awesome-opencode, opencode.cafe, Discord for new plugins/skills
- Evaluate each: does it solve a real gap in my current setup?
- Only adopt what adds genuine capability, not just novelty
- Contribute learnings back by publishing skills when they stabilize

---

# 自主执行工作流（用户免配置）

接受大型项目任务时，自动执行以下流程，无需用户手动触发：

## Phase 0 - 项目探底
### 0.1 全貌扫描
- read + glob 了解目录结构和文件分布
- lsp_symbols + lsp_diagnostics 获取代码符号/类型信息
- elf search 加载历史经验和相关 golden_rule

### 0.2 社区参考（写代码前必须做）
- grep_app_searchGitHub 搜索同类项目代码模式
- websearch 搜索最新技术方案/最佳实践
- webfetch 抓取具体文档/博客

## Phase 1 - 规划
### 1.1 需求澄清
- brainstorming skill 探索需求、边界、设计
- 不确定时：spawn_agent 派 oracle 做架构评估

### 1.2 结构化规划
- 输出 PLAN.md（目标 + 里程碑 + 完成标准）
- 输出 TODOS.md（每步含 QA 验证方式）
- git-master skill 创建 feature branch / worktree 隔离

### 1.3 任务复杂度判定
| 判定标准 | 模式 | 工具 |
|---------|------|------|
| 1-3步 · 明确改动 | 直做 | 自己执行 |
| 4-10步 · 单模块 | 子agent | subagent_spawn / spawn_agent |
| 10+步 · 多模块 | 多agent并发 | spawn_agent + oracle/hephaestus/momus |
| 需自主迭代 | Ralph loop | ralph_quickstart_wizard → ralph_create_supervisor_session |

## Phase 2 - 实现
### 2.1 代码库理解（每次写代码前）
- AST-grep (ast_grep_search) 搜索代码结构
- LSP goto_definition / find_references 理解依赖关系
- 复杂代码：调用 explore agent 做深入分析

### 2.2 多Agent并发模式
- 多独立任务 → spawn_agent 并发派发:
```
spawn_agent([
  {agent:"hephaestus", prompt:"...", category:"deep"},
  {agent:"explore", prompt:"..."},
  {agent:"librarian", prompt:"..."}
])
```
- 任务依赖链 → subagent_spawn 按序执行

### 2.3 提示词优化（Quality In = Quality Out）
- skill 优先加载：brainstorming → 对应领域 skill → 执行
- 提示词结构：上下文 + 角色 + 约束 + 输出格式 + 验证方式
- 复杂任务分步提示，不一次塞太多
- 善用 category 参数：deep(复杂逻辑), quick(简单), ultrabrain(疑难), visual-engineering(前端)

## Phase 3 - 质量保障
### 3.1 两级审查
1. 自动检查层：LSP diagnostics（语法+类型）→ 零容忍
2. 审查层：momus/reviewer agent（逻辑+安全+性能）

### 3.2 Vibeguard 防幻觉
- opencode-vibeguard 自动拦截幻觉输出
- 当 agent 可能出错时：用 multi-step verification

### 3.3 Manual QA（不可跳过）
| 改动类型 | 必须做的验证 |
|---------|-------------|
| CLI 命令 | bash 运行 → 截图/输出 |
| API 行为 | 调用 endpoint → 响应验证 |
| 构建输出 | build 命令 → exit 0 |
| UI 渲染 | 浏览器/截图 |
| 全部 | 回归测试 → 原有测试通过 |

## Phase 4 - 收尾
### 4.1 文档同步
- docs-writer agent 更新 README/API 文档
- 更新 AGENTS.md 中过时的项目上下文

### 4.2 Git 自动化
- git-master skill 自动生成 conventional commit
- worktree 插件隔离开发 + 自动清理
- command-hooks 保证提交前 lint + test 通过

### 4.3 学习记录
- 每次 session 结束：
  - elf add-rule type=learning 记录经验
  - 重复 >2次的模式 → type=golden_rule 固化
  - 错误/故障 → 记录修复方案

---

# 8大维度增强配置

## 1. 记忆系统 (Memory)
### 工作记忆 (Session内)
- opencode-working-memory 插件自动管理短期上下文
- ledgers（ledger_save/load）做跨步长任务状态持久化

### 持久记忆 (Session间)
- ELF golden_rule：跨 session 持久的不可变规则
- ELF learning：session 级别的学习经验
- opencode-session-search 搜索历史对话

### 记忆触发策略
- Session 启动 → elf search 加载相关 golden_rule
- 遇到已知问题模式 → elf search 查历史
- Session 结束 → elf add-rule 提取新学习

## 2. Git自动化
### 工具链
| 组件 | 用途 |
|------|------|
| git-master skill | 所有 git 操作入口 |
| @ykaratkou/opencode-worktree | 隔离开发环境 |
| opencode-worktree-guard | 防止越界写入 |
| @tmegit/opencode-worktree-session | worktree session 管理 |
| opencode-command-hooks | 提交前 lint/test hook |

### 分支策略
- 功能开发 → 自动创建 feature/worktree 分支
- 并行开发 → worktree 插件隔离
- 完成 → git-master commit → push → finish-development-branch

## 3. 代码质量 (Code Quality)
### 三阶段质量门禁

Phase 1 - 静态分析（写代码前）
- LSP diagnostics → 类型/语法错误零容忍
- AST-grep 检查模式违规（如禁止的 API 调用）

Phase 2 - 运行时验证（写代码后）
- Manual QA：bash 运行验证功能正确性
- Vibeguard 自动检测幻觉/不一致输出

Phase 3 - 审查（合并前）
- momus / reviewer agent 做结构化 review
- 必须满足：LSP 零错误 + Manual QA 通过 + Tests 通过

## 4. 提示词优化 (Prompt Engineering)
### Skill 加载优先级
1. brainstorming（任何创造性工作前）
2. writing-plans（复杂任务需规划时）
3. 领域技能（inkos-deai, web-novel-craft 等）
4. 流程技能（systematic-debugging, test-driven-development）
5. verification-before-completion（完成前）

### 提示词模板
所有复杂提示必须包含：
```
[CONTEXT] 项目/代码库上下文
[GOAL] 明确的目标描述
[CONSTRAINTS] 限制条件（不改什么，不做什么）
[OUTPUT_FORMAT] 期望的输出格式
[QA] 如何验证这个任务完成
```

## 5. 项目管理 (Project Management)
### 任务跟踪
- todowrite 工具实时跟踪所有步骤
- 每步标记状态：pending → in_progress → completed
- 复杂任务：PLAN.md + TODOS.md 文件驱动

### 执行决策树
```
任务输入
├─ 是bug吗？→ systematic-debugging skill → 修复
├─ 是新功能？→ brainstorming → PLAN.md → 实现
├─ 是重构？→ 分析范围 → 分步实现 → regression test
└─ 是简单问题？→ 直接处理
```

## 6. 多Agent协作 & 编排优先级梯队

### 6.1 编排生态总览
当前工作区有 7 个编排/Agent 插件，各有侧重：

| 插件 | 核心能力 | 适用场景 | 入口 |
|------|---------|---------|------|
| **Hive（主编排）** | 任务DAG + worktree隔离 + 三Agent（Forager/Scout/Hygienic） | 功能开发全流程 | `hive_status()`, `hive_skill()`, `hive_feature_create()` |
| **Systematic** | ce:plan → ce:work → ce:review 完整SDLC管线 | 复杂任务的规范计划/审查 | `systematic_skill("ce:plan")` |
| **Superpowers-zh** | 中文头脑风暴/规划/子Agent驱动 | 中文场景下的规划与流程 | `skill("brainstorming")`, `skill("writing-plans")` |
| **Ralph** | 自省式循环（retry until pass） | 攻坚/核心算法/需多次迭代 | `ralph_quickstart_wizard` → `ralph_create_supervisor_session` |
| **OWFlow** | flow-init + 标准化开发/研究编排 | 项目初始化、框架搭建 | `skill("flow-init")`, `skill("development")` |
| **subtask2** | 任务并行分解 | 大任务拆子任务并发 | `spawn_agent` / 插件自有工具 |
| **OMRE** | 多维度分片代码审查 | 深度审查（安全性/性能/架构） | `omre_*` 工具 |

### 6.2 优先级梯队（谁指挥谁）

```
接到任务
├─ 项目初始化/框架搭建 → OWFlow（flow-init → development）
├─ 功能开发（有plan）
│  ├─ Hive 主编排 ← 默认入口
│  │  ├─ 规划阶段 → hive_skill("writing-plans") 或 systematic_skill("ce:plan")
│  │  │                 或 skill("brainstorming")（中文优先 Superpowers-zh）
│  │  ├─ 执行阶段 → task() 派 Forager 或 hive_worktree_start
│  │  │   └─ 需拆子任务 → subtask2 或 Hive Task DAG
│  │  ├─ 攻坚/反复调试 → Ralph loop
│  │  └─ 审查阶段 → Hygienic（默认）/ ce:review（规范审查）/ OMRE（深度分片）
│  └─ 始终只有一位「指挥」，其余为按需加载的工具
├─ 中文场景规划优先 → Superpowers-zh（skill("brainstorming") → skill("writing-plans")）
├─ 复杂多步任务需SDLC → Systematic（ce:plan → ce:work → ce:review）
└─ 单步/简单任务 → 直做，无需编排
```

### 6.3 Agent 角色分工（跨插件通用）
| Agent | 职责 | 来源 | 工具权限 |
|-------|------|------|---------|
| **Forager** | 功能实现（Hive工作树内） | Hive | read+write+bash |
| **Scout** | 探索/研究（只读） | Hive | read |
| **Hygienic** | 代码审查（Hive内置） | Hive | read |
| **oracle** | 架构评估、复杂逻辑分析 | oh-my-opencode/systematic | read |
| **explore** | 代码库探索、模式发现 | oh-my-opencode | read |
| **hephaestus** | 功能实现 | oh-my-opencode | read+write+bash |
| **momus** | 代码审查 | oh-my-opencode | read |
| **librarian** | 文档/社区资料查找 | oh-my-opencode | read |
| **supervisor** | 任务编排（Ralph/session管理） | ralph/plugins | read+write+bash |
| **docs-writer** | 文档编写 | oh-my-opencode | read+write |

### 6.4 防冲突规则

1. **同一时刻只有一位「指挥」** — 不要在 Hive 编排中途又启动 Ralph supervisor，或在 Ralph 循环中使用 spawn_agent 派发实现任务
2. **Hive 是主编排入口** — 接到任务先 `hive_status()` 检测阶段，其他编排系统作为 skill 按需加载，不抢占控制权
3. **Ralph 用于攻坚** — 仅在 Hive 执行中遇到需多次迭代的难题时才启用，完成后回到 Hive 生命周期
4. **Systematic/Superpowers 仅用于规划阶段** — 在 Hive 的 Planning 阶段加载辅助写 plan，不参与 Orchestration 阶段
5. **OWFlow 仅用于项目初始化** — 首次搭建项目结构后回归 Hive 管理功能开发
6. **审查三选一** — 一个任务的审查只走一条路径：Hygienic（默认、轻量）/ ce:review（结构化、规范）/ OMRE（深度分片、跨文件），不可混用
7. **不要嵌套编排** — 禁止在 Forager 工作中调用 `systematic_skill()` 或 `ralph_loop()`，只有 Hive（编排层）有权切换编排系统

## 7. 代码库理解 (Codebase Understanding)
### 工具链
| 工具 | 用途 |
|------|------|
| ast_grep_search | AST 模式搜索 |
| lsp_symbols | 符号表/大纲 |
| lsp_goto_definition | 跳转到定义 |
| lsp_find_references | 查找所有引用 |
| grep | 文本内容搜索 |
| glob | 文件路径模式匹配 |
| grep_app_searchGitHub | 社区代码参考 |

### 理解流程
1. glob 看目录结构 → 2. read 关键文件 → 3. ast_grep 理解模式 → 4. LSP 理解类型关系

## 8. 模型增强 (Model Enhancement)
### 当前约束
| 方面 | 详情 |
|------|------|
| **可用模型** | deepseek v4 flash（唯一可用，不要期待其他模型） |
| **Ultra 插件** | opencode-ultra 增强推理能力 |
| **Crew 插件** | @ogdev/opencode-crew 多模型编排（仅当 flash 不可用时降级） |
---

# 规则与红线

## 不可违抗规则
1. 外部搜索 / 社区参考在写代码前完成（零例外）
2. 复杂任务（10+步）必须走 spawn_agent 并发 / Ralph loop，不手动低效操作
3. 每次改动后必须 Manual QA（提交证据）
4. 重复两次以上的操作 → 提取为 ELF learning
5. LSP 报错必须修复，不能跳过
6. Session 结束必须做 self-reflection 并记录 ELF
7. 新增插件/MCP/项目/skill 后必须强制审计冲突和冗余，未审计前不得使用

## 触发条件（自动激活）
| 事件 | 动作 |
|------|------|
| 新任务 | Phase 0 → Phase 1 → ... |
| 命令失败 | 记录修复方案到 ELF |
| 新工作流发现 | 更新 AGENTS.md 或创建 skill |
| 用户确认有效方法 | 保存为 golden_rule |
| Token 浪费 | 优化提示词/模式 |
| 新增资源（插件/MCP/项目/skill） | 强制运行 New Resource Audit：冲突矩阵 + 分类目录 + 注册 AGENTS.md |
---

# Community Patterns (ECLECTIC — 4 High-Star Projects)

Integrated from audit of 4 top open-source agent projects:

| Project | Stars | Core Pattern |
|---------|-------|-------------|
| affaan-m/ECC | 188k⭐ | Agent Harness OM optimization, multi-harness, prompt defense |
| mattpocock/skills | 97.9k⭐ | Small composable skills, shared language, structured debug |
| obra/superpowers | 201k⭐ | Complete SD pipeline, subagent-driven development |
| anthropics/skills | 139k⭐ | Skill spec standard, YAML frontmatter, progressive disclosure |

## 🔬 Structured Debug Protocol (from mattpocock/skills /diagnose)

When debugging, follow this strict sequence:
1. **Reproduce** — Get a minimal, reliable reproducer
2. **Minimize** — Trim away unrelated code until the essence is isolated
3. **Hypothesize** — State 1-3 hypotheses before looking at code
4. **Instrument** — Add logging/tests to prove/disprove each hypothesis
5. **Fix** — Apply the smallest possible change
6. **Regression test** — Verify the fix + ensure nothing else broke

> Never jump to fix before understanding root cause.

## 🎯 Pre-Development Alignment (from mattpocock/skills /grill-me)

Before starting any non-trivial task:
1. State what you're about to build in 1 sentence
2. List 2-3 alternative approaches considered
3. State the key tradeoff decision
4. Get confirmation before writing code

This replaces wasted implementation with quick alignment.

## 📐 Skill Template Standard (from anthropics/skills spec)

Every custom skill should use this YAML frontmatter template:
```yaml
---
name: skill-name
description: One-line description of what this skill does
trigger: When to automatically invoke this skill
compatibility: Compatible agents/frameworks
---
```

Progressive disclosure:
- First paragraph: what this skill does (enough to decide)
- Body: how to use it step by step
- Advanced section: edge cases, config, troubleshooting

## 🛡️ Prompt Defense Baseline (from ECC)

Security patterns for every agent prompt:
- Never output credentials, keys, or tokens in responses
- Validate user-provided paths before file operations
- When uncertain about a command's effect, use dry-run first
- For destructive operations (delete, overwrite), confirm intent
- Strip sensitive data from debug output and error messages
- Default to deny for file writes outside the workspace

## 📝 Architecture Decision Records (from MattPocock + Superpowers)

Document significant decisions as ADRs in `.opencode/adr/`:
- **When**: A choice affects project architecture or workflow
- **Format**: `NNNN-title.md` with Context → Decision → Consequences
- **Key fields**: Title, Status (proposed/accepted/deprecated), Context, Decision, Consequences
- **Trigger**: Dependency changes, tooling switches, workflow modifications

Consequences must include BOTH benefits AND tradeoffs — no decision is purely positive.

## 🔄 Selective Install Architecture (from ECC)

For projects with multiple components:
- Each component has a manifest declaring its dependencies
- Installation is per-component, not all-or-nothing
- Shared base config with component-specific overlays
- New components register themselves, not centrally managed

Currently applied: OpenClaw musician plugins, InkOS novel projects.

## 📋 Skill Buckets (from mattpocock/skills)

Skills organized by functional bucket with bucket-level README:
- `engineering/` — TDD, debugging, architecture, code review
- `productivity/` — git, CI/CD, automation
- `misc/` — domain-specific skills (web-novel, music)

Each bucket has a README.md listing all skills and their overlap relationships.
---

# Resource Usage Protocol (资源使用规范)

## 核心铁律

### 铁律 1：先加载技能，后动手写代码
任何任务开始前:
  1. 判断任务领域
  2. skill("领域技能") 加载 1-3 个对应技能
  3. 阅读技能内容
  4. 按技能指导执行

### 铁律 2：加载失败不跳过，立即修复
skill("xxx") 失败时的修复链:
  1. 检查 skills/xxx/SKILL.md 是否存在
  2. 检查 symlink 是否有效 (ls -la)
  3. 检查对应插件是否安装 (ls node_modules)
  4. 修复后继续，不能跳过

### 铁律 3：galaxy 是前端必查项
任何前端开发任务，先 skill("galaxy") 查组件库。

### 铁律 4：社区参考在前，编码在后
写代码前必须:
  1. galaxy/ → 取 UI 组件
  2. awesome-selfhosted/ → 查开源方案
  3. awesome-design-tools/ → 找设计灵感

### 铁律 5：引用资源先 skill()，不直接操作目录
❌ 错误：cd 到目录找文件
✅ 正确：skill("galaxy") 按技能指引操作

## 三把加载工具
| 工具 | 用途 | 示例 |
|------|------|------|
| skill() | 工作区技能、插件技能 | skill("golang") |
| systematic_skill() | Systematic 流程技能 | systematic_skill("ce:plan") |
| hive_skill() | Hive 编排技能 | hive_skill("writing-plans") |

## skill() 解析顺序（交叉验证确认）

| 优先级 | 位置 | 标签 | 说明 |
|--------|------|------|------|
| 1 | Plugin-registered (npm) | `(builtin - Skill)` | 全局插件声明的技能 |
| 2 | `~/.opencode-workspace/skills/` | `(opencode - Skill)` | **主池**，46 个通用技能，同名优先匹配 |
| 3 | `~/.opencode-workspace/.opencode/skills/` | `(opencode-project - Skill)` | **仅唯一名有效**，不覆盖 skills/ |
| 4 | Builtin 命令 | `(builtin - Command)` | 原生内置命令 |

**NOT scanned:** `projects/xxx/.opencode/skills/` — 项目级技能目录不在解析路径中。
**skills/ 优先于 .opencode/skills/**：同名时 skills/ 胜（通过 golang 覆盖实验验证）。
**.opencode/skills/ 安全使用条件**：名称必须与 skills/ 不冲突（当前 7 个与 46 个零重叠）。

## Skill 分层调度规范（L0-L4）

加载 skill 时按四层调度，控制活跃数量，避免上下文膨胀：

| 层级 | 类别 | 技能 | 何时加载 | 上限 |
|------|------|------|----------|------|
| **L0·Meta** | 流程/规划 | brainstorming, writing-plans, verification-before-completion, systematic-debugging | 阶段检测后主动加载 | ≤2 |
| **L1·Domain** | 实现/领域 | golang, vue, frontend-design, 语言/框架技能 | 技术栈确认后主动加载 | ≤2 |
| **L2·Reference** | 数据/素材 | galaxy, awesome-selfhosted | 遇到瓶颈时查阅（不常驻） | 0 |
| **L3·Special** | 场景触发 | chinese-code-review, inkos, mcp-builder | 特定场景触发，不主动加载 | 0 |

**铁律：**
- 活跃加载总量（L0+L1）≤ 4 个
- L2 只查不用 load，直接 glob/read 数据文件
- L3 只有对应场景出现时才加载（如 `/chinese-code-review` 或网文创作）
- 优先用 `hive_skill()` 或 `systematic_skill()` 而非 `skill()` 保持目录清晰


## 信息放置决策树（已验证）

| 信息类型 | 放置位置 | 原因 |
|----------|----------|------|
| 通用方法论（golang, vue, 调试, 测试） | `~/.opencode-workspace/skills/` | 跨项目共享 |
| 工作区元技能（CI/CD, 安全, 性能） | `~/.opencode-workspace/.opencode/skills/` | 仅当名称不冲突时 |
| 项目特定知识 | `.opencode/AGENTS.md` + `PROJECT_STATUS.md` | Session 启动自动加载 |
| 跨 Session 上下文 | `elf add-rule` / `agentmemory` | 自动召回，无需文件结构 |
| 项目独特工作流 | `.opencode/skills/` 中加前缀（如 `uni-social-ci`） | 避免与通用技能同名冲突 |
## 故障速查表
| 症状 | 诊断命令 | 修复 |
|------|---------|------|
| skill not found | ls skills/名称/SKILL.md | 下载/创建技能 |
| symlink broken | ls -la skills/名称 | ln -sf 重建链接 |
| plugin not loaded | ls node_modules/插件 | npm install |
| galaxy 找不到 | ls ~/galaxy/ | git clone 重新拉取 |

---
**完整版（含完整技能清单、MCP 配置、插件管理协议）请参阅全局 AGENTS.md：**
`~/.config/opencode/AGENTS.md` → `Skills Management` / `MCP Server Configuration` / `Plugin Management Protocol` 章节。
**本文件 (Layer 3) 仅保留核心铁律速查。**

---

# §7 A2A 协议评估与社区项目集成

## A2A Protocol (Agent-to-Agent)

### 概述
Google 发布的开放 Agent-to-Agent 协议 (v1.0.0)，Linux Foundation 治理 (Apache-2.0)。
24k star 社区，5 个官方 SDK (Python/Go/JS/Java/.NET)。

核心机制：
- **Agent Card** — JSON 格式的能力声明 (实现 Agent 发现)
- **JSON-RPC 2.0** — 任务委派的标准协议
- **SSE Streaming** — 实时 Agent 间通信
- **A2A + MCP 互补关系** — A2A 做 Agent-to-Agent，MCP 做 Agent-to-Tool

### 社区项目评估

| 项目 | 类型 | 应用场景 |
|------|------|---------|
| python-a2a (themanojdesai) | A2A+MCP桥接 | A2AMCPAgent 包装 MCP 为 A2A agent，AgentNetwork 自动发现/路由 |
| @a2a-js/sdk | JS/TS SDK | 可转化为 OpenCode 插件 |
| artinet-sdk | A2A server | tRPC 传输层 (Apache-2.0) |
| mastra-ai/mastra | A2A client | TypeScript A2A 实现 |

### 架构决策与集成路径

**评分**: 可行性 7/10，新增价值 5/10，风险 3/10，工作量 6/10

**适用边界**:
- ✅ 能包装: 4 个持久 MCP (codegraph/agentmemory/skyvern/openspace) 作为 A2A agent
- ❌ 不能包装: OpenCode 的 ephemeral agent (Forager/Scout/Hygienic) — per-session 生命周期不匹配
- 🔄 A2A = 通信层，不是编排层 — Hive 继续做编排，A2A 做 MCP 间互操作

**推荐路径**:
1. 当前: 文档化 A2A 认知，保存 ELF golden rules (已完成)
2. 未来: python-a2a sidecar 进程包装 MCPs (需要时实施)
3. 不推荐: 替换 Hive 编排系统

### 跨编排工具协作原则 (补充)

| 原则 | 说明 |
|------|------|
| 单一指挥 | 同时只有一位编排者 (Hive/Ralph/Systematic 三选一) |
| 按需加载 | 未使用的编排插件不消耗激活上下文，skill()/hive_skill() 触发后才加载 |
| 资源不混用 | Skills(知识)/MCPs(工具)/Ref Libs(数据)/Plugins(基础设施) 四类各司其职 |
| 审查互斥 | Hygienic(默认)/ce:review(规范)/OMRE(深度分片) 一次审查只走一条路径 |
| A2A 边界 | A2A 协议适用于 MCP 层互操作，不适用 OpenCode 内部 Agent 编排 |
