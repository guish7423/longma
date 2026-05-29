use serde::Serialize;
use std::fmt;

/// Agent session state machine
/// States: Idle → Thinking → Responding → Idle
///                  → Error → Idle
#[derive(Debug, Clone, Serialize, PartialEq)]
#[allow(dead_code)]
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
#[allow(dead_code)]
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
    #[allow(dead_code)]
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
    #[allow(dead_code)]
    pub fn record_turn(&mut self, cost: &TurnCost) {
        self.total_input_tokens += cost.input_tokens as u64;
        self.total_output_tokens += cost.output_tokens as u64;
        self.total_cache_hit += cost.cache_hit_tokens as u64;
        self.total_cost_usd += cost.estimated_cost_usd;
    }

    /// Check if the session is in a state that can accept new input
    #[allow(dead_code)]
    pub fn can_accept_input(&self) -> bool {
        self.state == AgentState::Idle
    }
}

/// Build messages with cache-first ordering:
/// - System prompt always at position 0 (immutable prefix)
/// - Conversation history appended sequentially (never reorder)
/// - New messages added at the end only
#[allow(dead_code)]
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
#[allow(dead_code)]
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

#[cfg(test)]
mod tests {
    use super::*;

    // ─── State Machine Tests ─────────────────────────────────

    #[test]
    fn test_session_new() {
        let session = Session::new(1, "deepseek-v4-flash".into());
        assert_eq!(session.state, AgentState::Idle);
        assert_eq!(session.turn_count, 0);
        assert_eq!(session.conversation_id, 1);
    }

    #[test]
    fn test_transition_idle_to_thinking() {
        let mut session = Session::new(1, "flash".into());
        assert!(session.transition(AgentState::Thinking).is_ok());
        assert_eq!(session.state, AgentState::Thinking);
    }

    #[test]
    fn test_transition_thinking_to_responding() {
        let mut session = Session::new(1, "flash".into());
        session.transition(AgentState::Thinking).unwrap();
        assert!(session.transition(AgentState::Responding).is_ok());
        assert_eq!(session.state, AgentState::Responding);
    }

    #[test]
    fn test_transition_responding_to_idle_increments_turn() {
        let mut session = Session::new(1, "flash".into());
        session.transition(AgentState::Thinking).unwrap();
        session.transition(AgentState::Responding).unwrap();
        assert!(session.transition(AgentState::Idle).is_ok());
        assert_eq!(session.state, AgentState::Idle);
        assert_eq!(session.turn_count, 1);
    }

    #[test]
    fn test_transition_error_to_idle() {
        let mut session = Session::new(1, "flash".into());
        session.transition(AgentState::Error("test error".into())).unwrap();
        assert!(session.transition(AgentState::Idle).is_ok());
        assert_eq!(session.state, AgentState::Idle);
    }

    #[test]
    fn test_transition_invalid_idle_to_idle() {
        let mut session = Session::new(1, "flash".into());
        assert!(session.transition(AgentState::Idle).is_err());
    }

    #[test]
    fn test_transition_invalid_thinking_to_thinking() {
        let mut session = Session::new(1, "flash".into());
        session.transition(AgentState::Thinking).unwrap();
        assert!(session.transition(AgentState::Thinking).is_err());
    }

    #[test]
    fn test_transition_invalid_responding_to_thinking() {
        let mut session = Session::new(1, "flash".into());
        session.transition(AgentState::Thinking).unwrap();
        session.transition(AgentState::Responding).unwrap();
        assert!(session.transition(AgentState::Thinking).is_err());
    }

    #[test]
    fn test_can_accept_input() {
        let mut session = Session::new(1, "flash".into());
        assert!(session.can_accept_input());
        session.transition(AgentState::Thinking).unwrap();
        assert!(!session.can_accept_input());
    }

    // ─── Cost Calculation Tests ──────────────────────────────

    #[test]
    fn test_calculate_cost_flash_full_cache() {
        let cost = calculate_cost(1000, 500, 1000, "deepseek-v4-flash");
        // Cache hit: 1000 * 0.07 * 0.1 / 1_000_000 = 0.000007
        // Cache miss: 0
        // Output: 500 * 0.28 / 1_000_000 = 0.00014
        // Total: ~0.000147
        assert!((cost - 0.000147).abs() < 0.000001);
    }

    #[test]
    fn test_calculate_cost_flash_no_cache() {
        let cost = calculate_cost(1000, 500, 0, "deepseek-v4-flash");
        // Cache hit: 0
        // Cache miss: 1000 * 0.07 / 1_000_000 = 0.00007
        // Output: 500 * 0.28 / 1_000_000 = 0.00014
        // Total: ~0.00021
        assert!((cost - 0.00021).abs() < 0.000001);
    }

    #[test]
    fn test_calculate_cost_pro() {
        let cost = calculate_cost(1000, 500, 500, "deepseek-v4-pro");
        // Cache hit: 500 * 0.435 * 0.1 / 1_000_000 = 0.00002175
        // Cache miss: 500 * 0.435 / 1_000_000 = 0.0002175
        // Output: 500 * 1.74 / 1_000_000 = 0.00087
        // Total: ~0.00110925
        assert!((cost - 0.00110925).abs() < 0.000001);
    }

    #[test]
    fn test_calculate_cost_zero_tokens() {
        let cost = calculate_cost(0, 0, 0, "flash");
        assert!((cost - 0.0).abs() < 0.000001);
    }

    // ─── Turn Recording Tests ────────────────────────────────

    #[test]
    fn test_record_turn() {
        let mut session = Session::new(1, "flash".into());
        let cost = TurnCost {
            input_tokens: 100,
            output_tokens: 50,
            cache_hit_tokens: 80,
            cache_miss_tokens: 20,
            estimated_cost_usd: 0.0001,
        };
        session.record_turn(&cost);
        assert_eq!(session.total_input_tokens, 100);
        assert_eq!(session.total_output_tokens, 50);
        assert_eq!(session.total_cache_hit, 80);
        assert!((session.total_cost_usd - 0.0001).abs() < 0.000001);
    }

    // ─── Build Messages Tests ────────────────────────────────

    #[test]
    fn test_build_session_messages_structure() {
        let msgs = build_session_messages(
            "You are a helpful assistant",
            &[],
            &serde_json::json!({"role": "user", "content": "hello"}),
        );
        assert_eq!(msgs.len(), 2);
        assert_eq!(msgs[0]["role"], "system");
        assert_eq!(msgs[0]["content"], "You are a helpful assistant");
        assert_eq!(msgs[1]["role"], "user");
    }

    #[test]
    fn test_build_session_messages_with_history() {
        let history = vec![
            serde_json::json!({"role": "user", "content": "hi"}),
            serde_json::json!({"role": "assistant", "content": "hello!"}),
        ];
        let msgs = build_session_messages(
            "system prompt",
            &history,
            &serde_json::json!({"role": "user", "content": "new message"}),
        );
        assert_eq!(msgs.len(), 4);
        assert_eq!(msgs[0]["role"], "system");
        assert_eq!(msgs[1]["content"], "hi");
        assert_eq!(msgs[2]["content"], "hello!");
        assert_eq!(msgs[3]["content"], "new message");
    }
}
