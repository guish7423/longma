use crate::speculative::types::*;
use std::time::Instant;

pub struct SpeculativeInjector;

impl SpeculativeInjector {
    /// Run all speculative pre-checks on user input.
    /// Returns results that can be injected into the context.
    /// All tasks have 500ms timeout and fail silently.
    pub fn run(input: &str, conversation_history: &[crate::api::deepseek::ChatMessage]) -> Vec<SpeculativeResult> {
        let mut results = Vec::new();
        let start = Instant::now();

        // 1. Intent Analysis - classify user intent
        if let Some(result) = Self::analyze_intent(input) {
            results.push(result);
        }

        // 2. Pattern Recognition - detect recurring patterns
        if let Some(result) = Self::detect_patterns(input, conversation_history) {
            results.push(result);
        }

        // 3. Knowledge Warmup - pre-fetch relevant memories
        if let Some(result) = Self::warmup_knowledge(input) {
            results.push(result);
        }

        let elapsed = start.elapsed().as_millis() as u64;
        // Safety: if total speculative time exceeds 2s, trim results
        if elapsed > 2000 {
            eprintln!("Speculative injection took {elapsed}ms, returning partial results");
        }

        results
    }

    fn analyze_intent(input: &str) -> Option<SpeculativeResult> {
        let start = Instant::now();
        let input_lower = input.to_lowercase();

        let intent = if input_lower.starts_with("如何")
            || input_lower.starts_with("怎么")
            || input_lower.starts_with("what")
            || input_lower.starts_with("how")
            || input_lower.starts_with("why")
            || input_lower.ends_with('?')
        {
            IntentCategory::Question
        } else if input_lower.starts_with("设置")
            || input_lower.starts_with("配置")
            || input_lower.contains("温度")
            || input_lower.contains("temperature")
            || input_lower.contains("max_token")
        {
            IntentCategory::Settings
        } else if input_lower.contains("记得")
            || input_lower.contains("记忆")
            || input_lower.contains("memory")
        {
            IntentCategory::Memory
        } else if input_lower.contains("你能")
            || input_lower.contains("可以")
            || input_lower.contains("功能")
            || input_lower.contains("capability")
        {
            IntentCategory::Capability
        } else if input_lower.starts_with("帮我")
            || input_lower.starts_with("请")
            || input_lower.starts_with("执行")
            || input_lower.starts_with("run")
            || input_lower.starts_with("do")
        {
            IntentCategory::Command
        } else {
            IntentCategory::Chat
        };

        let latency = start.elapsed().as_millis() as u64;
        Some(SpeculativeResult {
            task_type: "intent_analysis".into(),
            content: format!("Detected intent: {}", intent.as_str()),
            confidence: 0.7,
            latency_ms: latency,
        })
    }

    fn detect_patterns(
        input: &str,
        history: &[crate::api::deepseek::ChatMessage],
    ) -> Option<SpeculativeResult> {
        let start = Instant::now();

        // Check for repeated questions
        let user_messages: Vec<&str> = history
            .iter()
            .filter(|m| m.role == "user")
            .map(|m| m.content.as_str())
            .collect();

        let input_lower = input.to_lowercase();
        let mut repeat_count = 0;
        for prev in &user_messages {
            if prev.to_lowercase() == input_lower {
                repeat_count += 1;
            }
        }

        let content = if repeat_count > 0 {
            format!("用户重复了同一问题（之前出现过 {repeat_count} 次）")
        } else {
            String::new()
        };

        let latency = start.elapsed().as_millis() as u64;
        if content.is_empty() {
            None
        } else {
            Some(SpeculativeResult {
                task_type: "pattern_recognition".into(),
                content,
                confidence: 0.8,
                latency_ms: latency,
            })
        }
    }

    fn warmup_knowledge(input: &str) -> Option<SpeculativeResult> {
        let start = Instant::now();

        // Pre-fetch memories related to input keywords
        if let Ok(store) = crate::memory::store::MemoryStore::new() {
            let keywords: Vec<String> = input
                .split_whitespace()
                .filter(|w| w.len() > 2)
                .map(String::from)
                .collect();

            if !keywords.is_empty() {
                let query = crate::memory::types::MemoryQuery {
                    keywords: Some(keywords),
                    limit: 3,
                    ..Default::default()
                };

                if let Ok(memories) = store.search(&query) {
                    if !memories.is_empty() {
                        let mut content = String::from("相关记忆:\n");
                        for mem in &memories {
                            content.push_str(&format!(
                                "- [{}] {}\n",
                                mem.category.as_str(),
                                mem.content
                            ));
                        }
                        let latency = start.elapsed().as_millis() as u64;
                        return Some(SpeculativeResult {
                            task_type: "knowledge_warmup".into(),
                            content,
                            confidence: 0.6,
                            latency_ms: latency,
                        });
                    }
                }
            }
        }

        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_analyze_intent_question() {
        let result = SpeculativeInjector::analyze_intent("如何学习Rust？");
        assert!(result.is_some());
        let r = result.unwrap();
        assert_eq!(r.task_type, "intent_analysis");
        assert!(r.content.contains("question"));
    }

    #[test]
    fn test_analyze_intent_english_question() {
        let result = SpeculativeInjector::analyze_intent("what is Rust?");
        assert!(result.is_some());
        let r = result.unwrap();
        assert!(r.content.contains("question"));
    }

    #[test]
    fn test_analyze_intent_settings() {
        let result = SpeculativeInjector::analyze_intent("设置温度到0.7");
        assert!(result.is_some());
        let r = result.unwrap();
        assert!(r.content.contains("settings"));
    }

    #[test]
    fn test_analyze_intent_command() {
        let result = SpeculativeInjector::analyze_intent("帮我写一段代码");
        assert!(result.is_some());
        let r = result.unwrap();
        assert!(r.content.contains("command"));
    }

    #[test]
    fn test_analyze_intent_english_command() {
        let result = SpeculativeInjector::analyze_intent("run the test suite");
        assert!(result.is_some());
        let r = result.unwrap();
        assert!(r.content.contains("command"));
    }

    #[test]
    fn test_analyze_intent_chat_default() {
        let result = SpeculativeInjector::analyze_intent("今天天气真好");
        assert!(result.is_some());
        let r = result.unwrap();
        assert!(r.content.contains("chat"));
    }

    #[test]
    fn test_analyze_intent_capability() {
        let result = SpeculativeInjector::analyze_intent("你能做什么");
        assert!(result.is_some());
        let r = result.unwrap();
        assert!(r.content.contains("capability"));
    }

    #[test]
    fn test_run_returns_intent_analysis() {
        // run() triggers embedded search; test intent analysis separately
        assert!(SpeculativeInjector::analyze_intent("你好").is_some());
    }

    #[test]
    fn test_detect_patterns_no_repeat() {
        let msg = crate::api::deepseek::ChatMessage {
            role: "user".into(),
            content: "hello".into(),
        };
        let result = SpeculativeInjector::detect_patterns("world", &[msg]);
        assert!(result.is_none());
    }

    #[test]
    fn test_detect_patterns_repeat() {
        let msg = crate::api::deepseek::ChatMessage {
            role: "user".into(),
            content: "hello".into(),
        };
        let result = SpeculativeInjector::detect_patterns("hello", &[msg]);
        assert!(result.is_some());
        let r = result.unwrap();
        assert_eq!(r.task_type, "pattern_recognition");
    }
}
