use serde::Serialize;
use std::fmt;

/// Agent session state machine
/// States: Idle → Thinking → Responding → Idle
///                  → Error → Idle
#[derive(Debug, Clone, Serialize, PartialEq)]
pub enum AgentState {
    Idle,
    Thinking,
    Responding,
    Error(String),
}

impl fmt::Display for AgentState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AgentState::Idle => write!(f, "idle"),
            AgentState::Thinking => write!(f, "thinking"),
            AgentState::Responding => write!(f, "responding"),
            AgentState::Error(_) => write!(f, "error"),
        }
    }
}

/// Cost tracking data attached to each session turn
#[derive(Debug, Clone, Serialize)]
pub struct TurnCost {
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub cache_hit_tokens: u32,
    pub cache_miss_tokens: u32,
    pub estimated_cost_usd: f64,
}

/// Active session managed by the engine
#[derive(Debug, Serialize)]
pub struct Session {
    pub conversation_id: i64,
    pub state: AgentState,
    pub turn_count: u32,
    pub total_input_tokens: u64,
    pub total_output_tokens: u64,
    pub total_cache_hit: u64,
    pub total_cost_usd: f64,
    pub model: String,
}

impl Session {
    pub fn new(conversation_id: i64, model: String) -> Self {
        Self {
            conversation_id,
            state: AgentState::Idle,
            turn_count: 0,
            total_input_tokens: 0,
            total_output_tokens: 0,
            total_cache_hit: 0,
            total_cost_usd: 0.0,
            model,
        }
    }

    /// Transition to a new state, returns error on invalid transition
    pub fn transition(&mut self, next: AgentState) -> Result<(), String> {
        let valid = match (&self.state, &next) {
            // Idle → anything valid (Thinking or Error)
            (AgentState::Idle, AgentState::Thinking) => true,
            (AgentState::Idle, AgentState::Error(_)) => true,
            // Thinking → Responding or Error
            (AgentState::Thinking, AgentState::Responding) => true,
            (AgentState::Thinking, AgentState::Error(_)) => true,
            // Responding → Idle (completed) or Error
            (AgentState::Responding, AgentState::Idle) => {
                self.turn_count += 1;
                true
            }
            (AgentState::Responding, AgentState::Error(_)) => true,
            // Error → Idle (recovery)
            (AgentState::Error(_), AgentState::Idle) => true,
            _ => false,
        };

        if valid {
            self.state = next;
            Ok(())
        } else {
            Err(format!(
                "Invalid state transition: {} → {}",
                self.state, next
            ))
        }
    }

    /// Record a turn's cost data
    pub fn record_turn(&mut self, cost: &TurnCost) {
        self.total_input_tokens += cost.input_tokens as u64;
        self.total_output_tokens += cost.output_tokens as u64;
        self.total_cache_hit += cost.cache_hit_tokens as u64;
        self.total_cost_usd += cost.estimated_cost_usd;
    }

    /// Check if the session is in a state that can accept new input
    pub fn can_accept_input(&self) -> bool {
        self.state == AgentState::Idle
    }
}

/// Build messages with cache-first ordering:
/// - System prompt always at position 0 (immutable prefix)
/// - Conversation history appended sequentially (never reorder)
/// - New messages added at the end only
pub fn build_session_messages(
    system_prompt: &str,
    history: &[serde_json::Value],
    new_message: &serde_json::Value,
) -> Vec<serde_json::Value> {
    let mut messages = Vec::new();

    // Fixed prefix: system prompt (ALWAYS first)
    messages.push(serde_json::json!({
        "role": "system",
        "content": system_prompt
    }));

    // Append existing history without reordering
    for msg in history {
        messages.push(msg.clone());
    }

    // Append new message at the end
    messages.push(new_message.clone());

    messages
}

/// Calculate estimated cost from token usage
pub fn calculate_cost(
    input_tokens: u32,
    output_tokens: u32,
    cache_hit_tokens: u32,
    model: &str,
) -> f64 {
    let cache_miss_tokens = input_tokens.saturating_sub(cache_hit_tokens);

    let (input_price_per_m, output_price_per_m) = if model.contains("pro") {
        (0.435, 1.74)
    } else {
        (0.07, 0.28)
    };

    let cache_hit_price = cache_hit_tokens as f64 * input_price_per_m * 0.1 / 1_000_000.0;
    let cache_miss_price = cache_miss_tokens as f64 * input_price_per_m / 1_000_000.0;
    let output_price = output_tokens as f64 * output_price_per_m / 1_000_000.0;

    cache_hit_price + cache_miss_price + output_price
}
