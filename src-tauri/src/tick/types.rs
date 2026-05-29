use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TickMode {
    Idle,
    Active,
    Task,
}

#[derive(Debug, Clone)]
pub struct TickConfig {
    pub idle_interval: Duration,
    pub active_interval: Duration,
    pub task_interval: Duration,
}

impl Default for TickConfig {
    fn default() -> Self {
        Self {
            idle_interval: Duration::from_secs(20 * 60),  // 20 min
            active_interval: Duration::from_secs(30),      // 30 sec
            task_interval: Duration::from_secs(5),          // 5 sec
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct TickHeartbeat {
    pub mode: TickMode,
    pub tick_count: u64,
    pub uptime_secs: u64,
    pub last_action: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ActionLogEntry {
    pub timestamp: i64,
    pub action: String,
    pub tick_id: u64,
}
