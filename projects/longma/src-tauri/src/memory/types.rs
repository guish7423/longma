use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MemoryCategory {
    Experience,
    Capability,
    Tool,
    Knowledge,
    UserProfile,
    Persona,
    SystemPrompt,
}

impl MemoryCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Experience => "experience",
            Self::Capability => "capability",
            Self::Tool => "tool",
            Self::Knowledge => "knowledge",
            Self::UserProfile => "user_profile",
            Self::Persona => "persona",
            Self::SystemPrompt => "system_prompt",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "experience" => Some(Self::Experience),
            "capability" => Some(Self::Capability),
            "tool" => Some(Self::Tool),
            "knowledge" => Some(Self::Knowledge),
            "user_profile" => Some(Self::UserProfile),
            "persona" => Some(Self::Persona),
            "system_prompt" => Some(Self::SystemPrompt),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryItem {
    pub id: Option<i64>,
    pub category: MemoryCategory,
    pub content: String,
    pub tags: Vec<String>,
    pub source: String,
    pub strength: f32,
    pub created_at: i64,
    pub accessed_at: i64,
    pub ttl: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct MemoryQuery {
    pub categories: Option<Vec<MemoryCategory>>,
    pub tags: Option<Vec<String>>,
    pub keywords: Option<Vec<String>>,
    pub limit: usize,
}

impl Default for MemoryQuery {
    fn default() -> Self {
        Self {
            categories: None,
            tags: None,
            keywords: None,
            limit: 5,
        }
    }
}

/// MemoryItem with its embedding vector (separate for efficiency)
pub struct MemoryItemWithEmbedding {
    #[allow(dead_code)]
    pub item: MemoryItem,
    pub embedding: Option<Vec<f32>>,
}
