use crate::memory::store::MemoryStore;
use crate::memory::types::*;

/// Extracts and stores memories from conversation interactions.
#[allow(dead_code)]
pub struct Writer;

impl Writer {
    /// Extract potential memories from a user message and store them.
    /// Returns count of memories written.
    #[allow(dead_code)]
    pub fn extract_and_store(
        user_message: &str,
        assistant_response: &str,
        source: &str,
    ) -> Result<u32, String> {
        let store = MemoryStore::new()?;
        let mut count = 0;

        // 1. Extract user preferences (identified by preference markers)
        let preference_patterns = [
            "我喜欢", "我更喜欢", "我喜欢用", "我不喜欢",
            "请用", "不要", "我是",
        ];
        for pattern in &preference_patterns {
            if let Some(pos) = user_message.find(pattern) {
                let excerpt = &user_message[pos..std::cmp::min(pos + 100, user_message.len())];
                let item = MemoryItem {
                    id: None,
                    category: MemoryCategory::UserProfile,
                    content: format!("用户偏好: {excerpt}"),
                    tags: vec!["preference".into(), "user_profile".into()],
                    source: source.into(),
                    strength: 0.4,
                    created_at: 0,
                    accessed_at: 0,
                    ttl: None,
                };
                if store.insert(&item).is_ok() {
                    count += 1;
                }
            }
        }

        // 2. Extract key knowledge from assistant responses (simple length-based heuristic)
        if assistant_response.len() > 200 {
            // Truncate to first significant paragraph
            let knowledge = if let Some(period) = assistant_response[..300].rfind('.') {
                &assistant_response[..=period]
            } else {
                &assistant_response[..std::cmp::min(200, assistant_response.len())]
            };

            let item = MemoryItem {
                id: None,
                category: MemoryCategory::Knowledge,
                content: format!("对话知识: {knowledge}"),
                tags: vec!["conversation".into(), "knowledge".into()],
                source: source.into(),
                strength: 0.3,
                created_at: 0,
                accessed_at: 0,
                ttl: Some(chrono::Utc::now().timestamp() + 30 * 24 * 3600), // 30-day TTL
            };
            if store.insert(&item).is_ok() {
                count += 1;
            }
        }

        // 3. Extract tool/capability mentions from assistant responses
        let tool_keywords = ["我可以", "我能", "支持", "功能", "capability"];
        for kw in &tool_keywords {
            if assistant_response.to_lowercase().contains(kw) {
                let start = assistant_response.find(kw).unwrap_or(0);
                let excerpt = &assistant_response[start..std::cmp::min(start + 100, assistant_response.len())];
                let item = MemoryItem {
                    id: None,
                    category: MemoryCategory::Capability,
                    content: format!("能力: {excerpt}"),
                    tags: vec!["capability".into(), "tool".into()],
                    source: source.into(),
                    strength: 0.3,
                    created_at: 0,
                    accessed_at: 0,
                    ttl: None,
                };
                if store.insert(&item).is_ok() {
                    count += 1;
                }
                break;
            }
        }

        Ok(count)
    }
}
