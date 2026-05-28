use crate::memory::types::*;
use std::collections::HashMap;

/// Simple keyword-based recognizer that determines which memory categories
/// to retrieve based on user input patterns.
pub struct Recognizer;

impl Recognizer {
    /// Analyze user input and return a MemoryQuery for relevant memories.
    pub fn recognize(input: &str) -> MemoryQuery {
        let input_lower = input.to_lowercase();
        let mut categories = Vec::new();

        // Extract meaningful keywords (words 3+ chars)
        let keywords: Vec<String> = input_lower
            .split_whitespace()
            .filter(|w| w.len() > 2)
            .map(String::from)
            .collect();

        // Detect categories based on intent patterns
        let patterns: HashMap<&str, Vec<&str>> = vec![
            ("你是谁", vec!["system_prompt", "persona"]),
            ("你能做什么", vec!["capability", "tool"]),
            ("我的", vec!["user_profile"]),
            ("记得", vec!["experience"]),
            ("上次", vec!["experience"]),
            ("设置", vec!["tool", "user_profile"]),
            ("help", vec!["capability"]),
            ("capability", vec!["capability"]),
            ("knowledge", vec!["knowledge"]),
            ("关于", vec!["knowledge"]),
            ("教我", vec!["knowledge"]),
            ("怎么", vec!["tool"]),
            ("如何", vec!["tool"]),
        ]
        .into_iter()
        .collect();

        for (trigger, cats) in &patterns {
            if input_lower.contains(trigger) {
                for cat_str in cats {
                    if let Some(cat) = MemoryCategory::from_str(cat_str) {
                        if !categories.contains(&cat) {
                            categories.push(cat);
                        }
                    }
                }
            }
        }

        // Default: always include user_profile if any personal query
        if !categories.is_empty() && !categories.contains(&MemoryCategory::UserProfile) {
            if input_lower.contains("我的") || input_lower.contains("我") {
                categories.push(MemoryCategory::UserProfile);
            }
        }

        MemoryQuery {
            categories: if categories.is_empty() { None } else { Some(categories) },
            tags: None,
            keywords: Some(keywords),
            limit: 5,
        }
    }
}
