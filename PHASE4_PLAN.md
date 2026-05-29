# LongMa Phase 4: 测试基础设施加固

## 目标
将 Rust 核心引擎的测试覆盖率从 18%（4/22 文件）提升至 90%+，确保生产可靠性。

## 非目标
- 本阶段不修改业务逻辑
- 本阶段不添加新功能
- 本阶段不做前端测试（留待 Phase 5）

## Wave 1 — Rust 引擎单元测试（6 模块）

### 1. 记忆系统 (`memory/`)
- `store.rs`: CRUD 操作、按类型检索、按标签检索、混合搜索
- `embedding.rs`: 向量生成、余弦相似度计算、blob 编解码
- `recognizer.rs`: 记忆识别分类、阈值过滤
- `injector.rs`: 注入器构建、上下文组装
- `writer.rs`: 写入策略、去重、更新

### 2. Agent 状态机 (`engine/agent.rs`)
- Session 状态转换（Idle→Thinking→Responding→Error→Idle）
- TurnCost 追踪（prompt_tokens, completion_tokens, cache_hit_tokens）
- 缓存优先消息构建（固定前缀部分 + 追加部分）
- 成本计算（Flash/Pro 双定价）

### 3. MCP 客户端 (`engine/mcp/`)
- `types.rs`: JSON-RPC 消息序列化/反序列化
- `transport.rs`: Stdio 进程通信、HTTP 传输、重试机制
- `client.rs`: Session 生命周期（connect→initialize→tools/list→shutdown）

### 4. TICK 时间感 (`tick/`)
- `engine.rs`: 心跳调速（Idle 20min / Active 30s / Task 5s）
- `reminder.rs`: 提醒创建/触发/完成
- `task_stack.rs`: 任务栈 push/pop/peek、可打断恢复、超时检测

### 5. 预判注入 (`speculative/`)
- `types.rs`: 预判任务定义（意图/模式/知识三种模式）
- `injector.rs`: 并行执行、500ms 超时、只读铁律验证

### 6. DeepSeek API (`api/deepseek.rs`)
- 请求构建（URL/headers/body）
- SSE 事件流解析（data: 行 + done 信号）
- 缓存优先消息构建（固定系统提示 + 历史）
- 成本追踪（prompt_tokens/completion_tokens/cached_tokens）

## Wave 2 — 错误类型化

将 `memory/store.rs` 和 `engine/` 下返回 `Result<_, String>` 的函数改为 `Result<_, anyhow::Error>` 或自定义错误枚举。

## Wave 3 — dead_code 清理

34 个 dead_code warnings: 对已连接 Tauri 命令的加 `#[allow(dead_code)]`，未连接的有意保留（API 已定义待使用）

## 完成标准
- ✅ 每个模块至少 4 个测试用例
- ✅ `cargo test` 全部通过
- ✅ 测试覆盖核心路径 + 错误路径 + 边界情况
