use serde::Serialize;

#[derive(Debug, Clone, PartialEq)]
#[allow(dead_code)]
pub enum SpeculativeTask {
    IntentAnalysis,
    PatternRecognition,
    KnowledgeWarmup,
}

#[derive(Debug, Clone, Serialize)]
pub struct SpeculativeResult {
    pub task_type: String,
    pub content: String,
    pub confidence: f32,
    pub latency_ms: u64,
}

/// Intent categories the speculative system can detect
#[derive(Debug, Clone, PartialEq)]
#[allow(dead_code)]
pub enum IntentCategory {
    Question,        // Asking about something
    Command,         // Giving an instruction
    Chat,            // Casual conversation
    Settings,        // Configuration change
    Memory,          // Memory-related request
    Capability,      // Asking what the agent can do
    Unknown,
}

impl IntentCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Question => "question",
            Self::Command => "command",
            Self::Chat => "chat",
            Self::Settings => "settings",
            Self::Memory => "memory",
            Self::Capability => "capability",
            Self::Unknown => "unknown",
        }
    }
}
