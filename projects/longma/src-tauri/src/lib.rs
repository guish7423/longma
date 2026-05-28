mod api;
mod db;
mod engine;

use serde::Serialize;

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

#[tauri::command]
async fn chat_stream(
    app: tauri::AppHandle,
    messages: Vec<api::deepseek::ChatMessage>,
    temperature: Option<f32>,
    max_tokens: Option<u32>,
) -> Result<(), String> {
    let config = api::config::load_config();
    if config.api_key.is_empty() {
        return Err("API key not configured. Please set your DeepSeek API key in settings.".into());
    }
    let temp = temperature.unwrap_or(config.temperature);
    let max_tok = max_tokens.unwrap_or(config.max_tokens);

    let client = api::deepseek::DeepSeekClient::new(
        config.api_key,
        config.model,
        temp,
        max_tok,
    );

    let messages = api::deepseek::build_messages(messages);
    client.chat_stream(messages, app).await
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
