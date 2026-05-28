use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LongMaConfig {
    pub api_key: String,
    pub model: String,
    #[serde(default = "default_temperature")]
    pub temperature: f32,
    #[serde(default = "default_max_tokens")]
    pub max_tokens: u32,
    /// Daily budget in USD (None = unlimited)
    #[serde(default)]
    pub daily_budget_usd: Option<f64>,
    /// Auto-compress context when over threshold
    #[serde(default = "default_auto_compress")]
    pub auto_compress: bool,
    /// Token threshold for auto-compression
    #[serde(default = "default_compress_threshold")]
    pub compress_threshold: u32,
    /// Prefer Flash model for cost efficiency
    #[serde(default = "default_prefer_flash")]
    pub prefer_flash: bool,
    /// MCP server configurations
    #[serde(default)]
    pub mcp_servers: Vec<crate::engine::mcp::types::McpServerConfig>,
}

fn default_temperature() -> f32 { 0.7 }
fn default_max_tokens() -> u32 { 4096 }
fn default_auto_compress() -> bool { true }
fn default_compress_threshold() -> u32 { 16384 }
fn default_prefer_flash() -> bool { true }

impl Default for LongMaConfig {
    fn default() -> Self {
        Self {
            api_key: String::new(),
            model: crate::api::deepseek::MODEL_FLASH.to_string(),
            temperature: default_temperature(),
            max_tokens: default_max_tokens(),
            daily_budget_usd: None,
            auto_compress: default_auto_compress(),
            compress_threshold: default_compress_threshold(),
            prefer_flash: default_prefer_flash(),
            mcp_servers: vec![],
        }
    }
}

pub fn config_path() -> PathBuf {
    let base = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join(".longma").join("config.json")
}

pub fn load_config() -> LongMaConfig {
    let path = config_path();
    fs::read_to_string(&path)
        .ok()
        .and_then(|content| serde_json::from_str(&content).ok())
        .unwrap_or_default()
}

pub fn save_config(config: &LongMaConfig) -> Result<(), String> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create config dir: {e}"))?;
    }
    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {e}"))?;
    fs::write(&path, content).map_err(|e| format!("Failed to write config: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn get_config() -> LongMaConfig {
    load_config()
}

#[tauri::command]
pub fn save_api_key(api_key: String) -> Result<(), String> {
    let mut config = load_config();
    config.api_key = api_key;
    save_config(&config)
}

#[tauri::command]
pub fn switch_model(model: String) -> Result<(), String> {
    let mut config = load_config();
    config.model = model;
    save_config(&config)
}


#[tauri::command]
pub fn update_config(
    api_key: Option<String>,
    model: Option<String>,
    temperature: Option<f32>,
    max_tokens: Option<u32>,
    daily_budget_usd: Option<Option<f64>>,
    auto_compress: Option<bool>,
    compress_threshold: Option<u32>,
    prefer_flash: Option<bool>,
    mcp_servers: Option<Vec<crate::engine::mcp::types::McpServerConfig>>,
) -> Result<LongMaConfig, String> {
    let mut config = load_config();
    if let Some(key) = api_key {
        config.api_key = key;
    }
    if let Some(m) = model {
        config.model = m;
    }
    if let Some(t) = temperature {
        config.temperature = t;
    }
    if let Some(mt) = max_tokens {
        config.max_tokens = mt;
    }
    if let Some(budget) = daily_budget_usd {
        config.daily_budget_usd = budget;
    }
    if let Some(ac) = auto_compress {
        config.auto_compress = ac;
    }
    if let Some(ct) = compress_threshold {
        config.compress_threshold = ct;
    }
    if let Some(pf) = prefer_flash {
        config.prefer_flash = pf;
    }
    if let Some(servers) = mcp_servers {
        config.mcp_servers = servers;
    }
    save_config(&config)?;
    Ok(config)
}