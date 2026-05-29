mod api;
mod db;
mod engine;
mod memory;
mod tick;
mod speculative;
mod tray;

use serde::Serialize;
use std::sync::{Arc, LazyLock};
use tauri::Manager;

#[derive(Debug, Serialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub model: String,
}

#[tauri::command]
fn get_app_info() -> AppInfo {
    AppInfo {
        name: "LongMa".into(),
        version: "0.1.0".into(),
        model: "deepseek-v4-flash".into(),
    }
}

use api::provider::ProviderClient;

#[tauri::command]
async fn chat_stream(
    app: tauri::AppHandle,
    messages: Vec<api::deepseek::ChatMessage>,
    temperature: Option<f32>,
    max_tokens: Option<u32>,
) -> Result<(), String> {
    let config = api::config::load_config();
    if config.api_key.is_empty() && config.providers.is_empty() {
        return Err("API key not configured. Please set your API key in settings.".into());
    }

    // Budget check — if over budget, fail early
    {
        let tracker = BUDGET_TRACKER.lock().unwrap();
        if let Some(remaining) = tracker.remaining_budget() {
            if remaining <= 0.0 {
                return Err("Daily budget exceeded. Reset budget in settings or wait until tomorrow.".into());
            }
        }
    }

    // Resolve provider + API key
    let provider_kind = api::provider::ProviderKind::from_str(&config.provider)
        .ok_or_else(|| format!("Unknown provider: {}", config.provider))?;

    // Find API key for this provider
    let api_key = if !config.api_key.is_empty() && config.provider == "deepseek" {
        config.api_key.clone()
    } else {
        config.providers.iter()
            .find(|p| p.id == config.provider)
            .map(|p| p.api_key.clone())
            .filter(|k| !k.is_empty())
            .or_else(|| {
                if !config.api_key.is_empty() {
                    Some(config.api_key.clone())
                } else {
                    None
                }
            })
            .ok_or_else(|| format!("No API key configured for provider '{}'. Add it in Settings.", config.provider))?
    };

    let base_url = config.providers.iter()
        .find(|p| p.id == config.provider)
        .and_then(|p| p.base_url.clone());

    let temp = temperature.unwrap_or(config.temperature);

    let client = ProviderClient::new(provider_kind, api_key, base_url);

    let messages = api::deepseek::build_messages(messages);
    let model = config.model.clone();

    // Helper: convert deepseek::ChatMessage -> provider::ChatMessage
    fn to_provider_msg(m: &api::deepseek::ChatMessage) -> api::provider::ChatMessage {
        api::provider::ChatMessage {
            role: m.role.clone(),
            content: m.content.clone(),
        }
    }

    // Run speculative injection on the latest user input
    if let Some(last_user_msg) = messages.iter().rev().find(|m| m.role == "user") {
        let speculative_results = speculative::injector::SpeculativeInjector::run(
            &last_user_msg.content,
            &messages,
        );

        if !speculative_results.is_empty() {
            let mut speculative_content = String::from("[Speculative Context]\n");
            for result in &speculative_results {
                speculative_content.push_str(&format!(
                    "[{}] (conf: {:.1}) {}\n",
                    result.task_type, result.confidence, result.content
                ));
            }

            let mut enhanced: Vec<api::provider::ChatMessage> = Vec::new();
            let last_user_pos = messages.len() - 1;

            for (i, msg) in messages.iter().enumerate() {
                if i == last_user_pos {
                    enhanced.push(api::provider::ChatMessage {
                        role: "system".into(),
                        content: speculative_content.clone(),
                    });
                }
                enhanced.push(to_provider_msg(msg));
            }

            // Memory injection (works with provider messages)
            if let Ok(memory_enhanced) = crate::memory::injector::Injector::inject_into_builder(
                enhanced.clone(),
                &last_user_msg.content,
            ) {
                enhanced = memory_enhanced;
            }

            client.chat_stream(enhanced, &model, app).await
        } else {
            let prov_msgs: Vec<api::provider::ChatMessage> = messages.iter().map(to_provider_msg).collect();

            if let Ok(memory_enhanced) = crate::memory::injector::Injector::inject_into_builder(
                prov_msgs.clone(),
                &last_user_msg.content,
            ) {
                client.chat_stream(memory_enhanced, &model, app).await
            } else {
                client.chat_stream(prov_msgs, &model, app).await
            }
        }
    } else {
        let prov_msgs: Vec<api::provider::ChatMessage> = messages.iter().map(to_provider_msg).collect();
        client.chat_stream(prov_msgs, &model, app).await
    }
}

#[tauri::command]
async fn chat_once(
    messages: Vec<api::deepseek::ChatMessage>,
) -> Result<api::deepseek::ChatResponse, String> {
    let config = api::config::load_config();
    if config.api_key.is_empty() {
        return Err("API key not configured.".into());
    }
    let client = api::deepseek::DeepSeekClient::new(
        config.api_key,
        config.model,
        config.temperature,
        config.max_tokens,
    );
    let messages = api::deepseek::build_messages(messages);
    client.chat(messages).await
}

#[tauri::command]
fn get_session_state() -> engine::agent::Session {
    // Return a fresh idle session (state managed by frontend)
    engine::agent::Session::new(0, "deepseek-v4-flash".into())
}

#[tauri::command]
fn calculate_turn_cost(
    input_tokens: u32,
    output_tokens: u32,
    cache_hit_tokens: u32,
    model: String,
) -> engine::cost::CostRecord {
    engine::cost::CostRecord::new(input_tokens, output_tokens, cache_hit_tokens, &model)
}

#[derive(Debug, Serialize)]
pub struct ConversationCost {
    pub id: i64,
    pub title: String,
    pub total_input_tokens: u64,
    pub total_output_tokens: u64,
    pub total_cache_hit_tokens: u64,
    pub total_cost: f64,
    pub cache_hit_rate: f64,
    pub message_count: u32,
}

#[tauri::command]
fn get_cost_summary() -> Result<engine::cost::CostSummary, String> {
    let db = db::store::Database::new().map_err(|e| e.to_string())?;
    let messages = db.get_all_messages().map_err(|e| e.to_string())?;
    let model = api::config::load_config().model;
    let mut summary = engine::cost::CostSummary::new();
    for msg in &messages {
        let cache_hit_tokens = if msg.cache_hit { msg.tokens_in } else { 0 };
        let record = engine::cost::CostRecord::new(
            msg.tokens_in, msg.tokens_out, cache_hit_tokens, &model,
        );
        summary.add_record(&record);
    }
    let mut ids = std::collections::HashSet::new();
    for msg in &messages {
        ids.insert(msg.conversation_id);
    }
    summary.total_sessions = ids.len() as u32;
    Ok(summary)
}

#[tauri::command]
fn get_conversation_costs() -> Result<Vec<ConversationCost>, String> {
    let db = db::store::Database::new().map_err(|e| e.to_string())?;
    let conversations = db.list_conversations().map_err(|e| e.to_string())?;
    let model = api::config::load_config().model;
    let mut costs = Vec::new();
    for conv in conversations {
        let msgs = db.get_conversation_messages(conv.id).map_err(|e| e.to_string())?;
        if msgs.is_empty() { continue; }
        let mut input: u64 = 0; let mut output: u64 = 0;
        let mut cached: u64 = 0; let mut total_cost: f64 = 0.0;
        for msg in &msgs {
            input += msg.tokens_in as u64;
            output += msg.tokens_out as u64;
            let cache_tokens = if msg.cache_hit { msg.tokens_in } else { 0 };
            cached += cache_tokens as u64;
            let record = engine::cost::CostRecord::new(
                msg.tokens_in, msg.tokens_out, cache_tokens, &model,
            );
            total_cost += record.estimated_cost;
        }
        let cache_rate = if input > 0 { cached as f64 / input as f64 } else { 0.0 };
        costs.push(ConversationCost {
            id: conv.id, title: conv.title,
            total_input_tokens: input, total_output_tokens: output,
            total_cache_hit_tokens: cached, total_cost,
            cache_hit_rate: cache_rate, message_count: msgs.len() as u32,
        });
    }
    costs.sort_by(|a, b| b.total_cost.partial_cmp(&a.total_cost).unwrap_or(std::cmp::Ordering::Equal));
    Ok(costs)
}

// ─── Memory Commands ──────────────────────────────────────────

#[tauri::command]
fn search_memory(query: String, category: Option<String>, limit: Option<usize>) -> Result<Vec<memory::types::MemoryItem>, String> {
    let store = memory::store::MemoryStore::new()?;
    let mut q = memory::types::MemoryQuery::default();
    q.keywords = Some(query.split_whitespace().map(String::from).collect());
    q.limit = limit.unwrap_or(5);
    if let Some(cat_str) = category {
        if let Some(cat) = memory::types::MemoryCategory::from_str(&cat_str) {
            q.categories = Some(vec![cat]);
        }
    }
    store.search(&q)
}

#[tauri::command]
fn write_memory(category: String, content: String, tags: Vec<String>, source: String) -> Result<i64, String> {
    let store = memory::store::MemoryStore::new()?;
    let cat = memory::types::MemoryCategory::from_str(&category)
        .ok_or_else(|| format!("Invalid category: {category}"))?;
    let item = memory::types::MemoryItem {
        id: None,
        category: cat,
        content,
        tags,
        source,
        strength: 0.5,
        created_at: 0,
        accessed_at: 0,
        ttl: None,
    };
    store.insert(&item)
}

#[tauri::command]
fn list_memories(category: Option<String>) -> Result<Vec<memory::types::MemoryItem>, String> {
    let store = memory::store::MemoryStore::new()?;
    if let Some(cat_str) = category {
        if let Some(cat) = memory::types::MemoryCategory::from_str(&cat_str) {
            return store.list_by_category(&cat);
        }
    }
    // Return all (search with empty query, high limit)
    let q = memory::types::MemoryQuery {
        limit: 100,
        ..Default::default()
    };
    store.search(&q)
}

#[tauri::command]
fn delete_memory(id: i64) -> Result<(), String> {
    let store = memory::store::MemoryStore::new()?;
    store.delete(id)
}

// ─── Reminder Commands ────────────────────────────────────────

#[tauri::command]
fn create_reminder(title: String, description: String, due_at: i64, repeat_interval: Option<i64>) -> Result<i64, String> {
    let store = tick::reminder::ReminderStore::new()?;
    store.create(&title, &description, due_at, repeat_interval)
}

#[tauri::command]
fn list_reminders() -> Result<Vec<tick::reminder::Reminder>, String> {
    let store = tick::reminder::ReminderStore::new()?;
    store.list()
}

#[tauri::command]
fn cancel_reminder(id: i64) -> Result<(), String> {
    let store = tick::reminder::ReminderStore::new()?;
    store.cancel(id)
}

// ─── Task Stack Commands ──────────────────────────────────────

static TASK_STACK: LazyLock<tick::task_stack::TaskStack> = LazyLock::new(tick::task_stack::TaskStack::new);

#[tauri::command]
fn suspend_task(description: String, context: Option<String>) -> String {
    TASK_STACK.suspend(&description, context)
}

#[tauri::command]
fn resume_task(id: String) -> Option<tick::task_stack::SuspendedTask> {
    TASK_STACK.resume(&id)
}

#[tauri::command]
fn cancel_task(id: String) -> bool {
    TASK_STACK.cancel(&id)
}

#[tauri::command]
fn list_suspended_tasks() -> Vec<tick::task_stack::SuspendedTask> {
    TASK_STACK.list()
}

// ─── Cache Commands (Phase 3 — Three-Tier Cache) ────────────

static THREE_TIER_CACHE: LazyLock<std::sync::Mutex<engine::cache::ThreeTierCache>> =
    LazyLock::new(|| std::sync::Mutex::new(engine::cache::ThreeTierCache::new()));

#[tauri::command]
fn get_cache_stats() -> engine::cache::CacheStats {
    THREE_TIER_CACHE.lock().unwrap().get_stats().clone()
}

#[tauri::command]
fn cache_lookup(key: String) -> Option<(String, String)> {
    // Returns content and zone name on hit
    THREE_TIER_CACHE
        .lock()
        .unwrap()
        .lookup(&key)
        .map(|(content, zone)| (content, zone.to_string()))
}

#[tauri::command]
fn cache_insert(key: String, content: String, token_count: u32) {
    THREE_TIER_CACHE
        .lock()
        .unwrap()
        .insert(key, content, token_count);
}

#[tauri::command]
fn invalidate_conversation_cache(conversation_id: i64) {
    THREE_TIER_CACHE
        .lock()
        .unwrap()
        .invalidate_conversation(conversation_id);
}

// ─── Tool Engine Commands (Phase 3 — Parallel Tools + Repair) ─

static TOOL_ENGINE: LazyLock<std::sync::Mutex<engine::tools::ToolEngine>> =
    LazyLock::new(|| std::sync::Mutex::new(engine::tools::ToolEngine::new()));

#[tauri::command]
fn list_tools() -> Vec<engine::tools::Tool> {
    TOOL_ENGINE
        .lock()
        .unwrap()
        .list_tools()
        .into_iter()
        .cloned()
        .collect()
}

#[tauri::command]
fn get_tool_info(name: String) -> Option<engine::tools::Tool> {
    TOOL_ENGINE.lock().unwrap().get_tool(&name).cloned()
}

// ─── Budget Commands (Phase 3 — Cost Control) ───────────────

static BUDGET_TRACKER: LazyLock<std::sync::Mutex<engine::budget::BudgetState>> =
    LazyLock::new(|| std::sync::Mutex::new(engine::budget::BudgetState::new(None)));

#[tauri::command]
fn get_budget_status() -> engine::budget::BudgetState {
    BUDGET_TRACKER.lock().unwrap().clone()
}

#[tauri::command]
fn record_budget_spend(cost: f64, conversation_id: i64) {
    BUDGET_TRACKER.lock().unwrap().record_spend(cost, conversation_id);
}

#[tauri::command]
fn record_budget_failure() {
    BUDGET_TRACKER.lock().unwrap().record_failure();
}

#[tauri::command]
fn reset_budget() {
    let config = api::config::load_config();
    let mut tracker = BUDGET_TRACKER.lock().unwrap();
    *tracker = engine::budget::BudgetState::new(config.daily_budget_usd);
    tracker.prefer_flash = config.prefer_flash;
    tracker.auto_compress = config.auto_compress;
    tracker.compress_threshold = config.compress_threshold;
}

#[tauri::command]
fn update_budget_config(
    daily_budget_usd: Option<Option<f64>>,
    auto_compress: Option<bool>,
    compress_threshold: Option<u32>,
    prefer_flash: Option<bool>,
) {
    let mut tracker = BUDGET_TRACKER.lock().unwrap();
    if let Some(budget) = daily_budget_usd {
        tracker.daily_budget_usd = budget;
    }
    if let Some(ac) = auto_compress {
        tracker.auto_compress = ac;
    }
    if let Some(ct) = compress_threshold {
        tracker.compress_threshold = ct;
    }
    if let Some(pf) = prefer_flash {
        tracker.prefer_flash = pf;
    }
}

// ─── MCP Commands (Phase 3 — MCP Client) ─────────────────────

use engine::mcp::types::{McpServerConfig, McpServerStatus, McpTool, McpToolResult};

#[tauri::command]
async fn list_mcp_servers() -> Vec<McpServerConfig> {
    crate::api::config::load_config().mcp_servers
}

#[tauri::command]
async fn connect_mcp_server(
    mcp: tauri::State<'_, engine::mcp::client::SharedMcpManager>,
    config: McpServerConfig,
) -> Result<McpServerStatus, String> {
    let name = config.name.clone();
    {
        let manager = mcp.lock().await;
        if let Some(status) = manager.get_status(&name) {
            if status.connected {
                return Err(format!("Server '{}' is already connected", name));
            }
        }
    }
    mcp.lock().await.connect(config.clone()).await?;
    let status = mcp.lock().await.get_status(&name)
        .ok_or("Failed to get server status after connect")?;
    Ok(status)
}

#[tauri::command]
async fn disconnect_mcp_server(
    mcp: tauri::State<'_, engine::mcp::client::SharedMcpManager>,
    name: String,
) -> Result<(), String> {
    mcp.lock().await.disconnect(&name).await
}

#[tauri::command]
async fn list_mcp_status(
    mcp: tauri::State<'_, engine::mcp::client::SharedMcpManager>,
) -> Result<Vec<McpServerStatus>, String> {
    Ok(mcp.lock().await.list_status())
}

#[tauri::command]
async fn list_mcp_tools(
    mcp: tauri::State<'_, engine::mcp::client::SharedMcpManager>,
) -> Result<Vec<(String, McpTool)>, String> {
    Ok(mcp.lock().await.list_all_tools())
}

#[tauri::command]
async fn call_mcp_tool(
    mcp: tauri::State<'_, engine::mcp::client::SharedMcpManager>,
    server_name: String,
    tool_name: String,
    args: serde_json::Value,
) -> Result<McpToolResult, String> {
    mcp.lock().await.call_tool(&server_name, &tool_name, args).await
}

// ─── Provider Commands (Phase 4 — Multi-Provider LLM) ───────

use api::provider::ModelInfo;

#[tauri::command]
fn list_models() -> Vec<ModelInfo> {
    api::provider::builtin_models()
}

#[tauri::command]
fn get_active_provider() -> String {
    api::config::load_config().provider
}

#[tauri::command]
fn switch_provider(provider: String) -> Result<(), String> {
    let mut config = api::config::load_config();
    config.provider = provider;
    api::config::save_config(&config)
}

// ─── Media Player Commands ───────────────────────────────────

use std::sync::Mutex;

static AUDIO_PLAYER: std::sync::LazyLock<Mutex<Option<crate::engine::player::AudioPlayer>>> =
    std::sync::LazyLock::new(|| Mutex::new(None));

#[tauri::command]
fn player_play(path: String) -> Result<(), String> {
    let mut guard = AUDIO_PLAYER.lock().unwrap();
    let mut player = guard.take().unwrap_or_else(crate::engine::player::AudioPlayer::new);
    player.load(&path)?;
    player.play()?;
    *guard = Some(player);
    Ok(())
}

#[tauri::command]
fn player_pause() -> Result<(), String> {
    let mut guard = AUDIO_PLAYER.lock().unwrap();
    if let Some(ref mut player) = *guard {
        player.pause()?;
    }
    Ok(())
}

#[tauri::command]
fn player_resume() -> Result<(), String> {
    let mut guard = AUDIO_PLAYER.lock().unwrap();
    if let Some(ref mut player) = *guard {
        player.play()?;
    }
    Ok(())
}

#[tauri::command]
fn player_stop() -> Result<(), String> {
    let mut guard = AUDIO_PLAYER.lock().unwrap();
    if let Some(ref mut player) = *guard {
        player.stop()?;
    }
    Ok(())
}

#[tauri::command]
fn player_set_volume(volume: f32) -> Result<(), String> {
    let mut guard = AUDIO_PLAYER.lock().unwrap();
    if let Some(ref mut player) = *guard {
        player.set_volume(volume)?;
    }
    Ok(())
}

// ─── System Monitor Commands ─────────────────────────────────

#[tauri::command]
fn get_system_resources() -> crate::engine::monitor::SystemResources {
    crate::engine::monitor::collect_resources()
}

// ─── Tick Commands ────────────────────────────────────────────

#[tauri::command]
fn notify_activity(tick_engine: tauri::State<'_, std::sync::Arc<tick::engine::TickEngine>>) {
    tick_engine.notify_activity();
}

#[tauri::command]
fn get_tick_heartbeat(tick_engine: tauri::State<'_, std::sync::Arc<tick::engine::TickEngine>>) -> tick::types::TickHeartbeat {
    tick_engine.get_heartbeat()
}

// ─── App Entry Point ──────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let tick_engine = Arc::new(tick::engine::TickEngine::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(tick_engine.clone())
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            chat_stream,
            chat_once,
            api::config::get_config,
            api::config::save_api_key,
            api::config::switch_model,
            get_session_state,
            get_session_state,
            calculate_turn_cost,
            get_cost_summary,
            get_conversation_costs,
            api::config::update_config,
            // Memory commands
            search_memory,
            write_memory,
            list_memories,
            delete_memory,
            // Budget commands
            get_budget_status,
            record_budget_spend,
            record_budget_failure,
            reset_budget,
            update_budget_config,
            // Tick commands
            notify_activity,
            get_tick_heartbeat,
            // Reminder commands
            create_reminder,
            list_reminders,
            cancel_reminder,
            // Task stack commands
            suspend_task,
            resume_task,
            cancel_task,
            list_suspended_tasks,
            // Cache commands
            get_cache_stats,
            cache_lookup,
            cache_insert,
            invalidate_conversation_cache,
            // Tool engine commands
            list_tools,
            get_tool_info,
            // MCP commands
            list_mcp_servers,
            connect_mcp_server,
            disconnect_mcp_server,
            list_mcp_status,
            list_mcp_tools,
            call_mcp_tool,
            // Provider commands
            list_models,
            get_active_provider,
            switch_provider,
            // Media player commands
            player_play,
            player_pause,
            player_resume,
            player_stop,
            player_set_volume,
            // System monitor commands
            get_system_resources,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Hide window instead of quitting
                let _ = window.hide();
            }
        })
        .setup(move |app| {
            let handle = app.handle();
            // Initialize budget tracker from config
            let config = api::config::load_config();
            {
                let mut tracker = BUDGET_TRACKER.lock().unwrap();
                tracker.daily_budget_usd = config.daily_budget_usd;
                tracker.auto_compress = config.auto_compress;
                tracker.compress_threshold = config.compress_threshold;
                tracker.prefer_flash = config.prefer_flash;
            }
            // Initialize MCP manager
            let mcp_manager = engine::mcp::client::create_shared_manager();
            app.manage(mcp_manager);
            // Start TICK engine on app startup
            tick_engine.start(handle.clone());
            // Build system tray
            let _ = tray::build_tray(handle);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
