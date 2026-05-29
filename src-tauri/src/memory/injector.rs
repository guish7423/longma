use crate::api::provider::ChatMessage;
use crate::memory::store::MemoryStore;
use crate::memory::types::*;

/// Injects relevant memories into the conversation context as system messages.
pub struct Injector;

impl Injector {
    /// Retrieve memories based on query and inject them into messages.
    pub fn inject(
        messages: &[ChatMessage],
        query: MemoryQuery,
    ) -> Result<Vec<ChatMessage>, String> {
        let store = MemoryStore::new()?;
        let memories = store.search(&query)?;

        if memories.is_empty() {
            return Ok(messages.to_vec());
        }

        // Group memories by category for readable injection
        let mut by_category: std::collections::BTreeMap<String, Vec<&MemoryItem>> =
            std::collections::BTreeMap::new();
        for mem in &memories {
            let cat = mem.category.as_str().to_string();
            by_category.entry(cat).or_default().push(mem);
        }

        // Format memories as a system message
        let mut memory_content = String::from("[Memory Recall]\n");
        for (cat, items) in &by_category {
            memory_content.push_str(&format!("\n--- {cat} ---\n"));
            for item in items {
                memory_content.push_str(&format!("- {}\n", item.content));
            }
        }

        memory_content.push_str("\nUse the above memories as context when appropriate.");

        let mut result = messages.to_vec();
        // Insert memory system message right after the first system message (or at position 0)
        let memory_msg = ChatMessage {
            role: "system".into(),
            content: memory_content,
        };

        if let Some(pos) = result.iter().position(|m| m.role == "system") {
            result.insert(pos + 1, memory_msg);
        } else {
            result.insert(0, memory_msg);
        }

        Ok(result)
    }

    /// Inject into the existing messages builder for chat_stream/chat_once.
    /// Returns modified messages with memory context prepended.
    pub fn inject_into_builder(
        messages: Vec<ChatMessage>,
        user_input: &str,
    ) -> Result<Vec<ChatMessage>, String> {
        let query = crate::memory::recognizer::Recognizer::recognize(user_input);
        Self::inject(&messages, query)
    }
}
