use tauri::Emitter;

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::time::Duration;

pub const API_BASE: &str = "https://api.deepseek.com";
pub const MODEL_FLASH: &str = "deepseek-v4-flash";
pub const MODEL_PRO: &str = "deepseek-v4-pro";

// ---------- API Types ----------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatResponse {
    pub id: String,
    pub choices: Vec<Choice>,
    pub usage: Option<Usage>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Choice {
    pub message: ChatMessage,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Usage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    #[serde(default)]
    pub prompt_tokens_details: PromptTokensDetails,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct PromptTokensDetails {
    #[serde(default)]
    pub cached_tokens: u32,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct StreamChunk {
    pub content: String,
    pub finish_reason: Option<String>,
    #[serde(default)]
    pub input_tokens: u32,
    #[serde(default)]
    pub output_tokens: u32,
    #[serde(default)]
    pub cache_hit_tokens: u32,
    pub done: bool,
}

// ---------- Cache-Stable Prompt ----------

pub fn build_system_prompt() -> String {
    vec![
        "You are LongMa, a desktop AI agent powered by DeepSeek.".to_string(),
        "You respond concisely and accurately.".to_string(),
        "You have access to conversation history and can reference past discussions.".to_string(),
    ]
    .join("\n")
}

/// Build the full message list as append-only log (cache-first design).
/// System prompt stays at position 0, conversation history appends after.
pub fn build_messages(history: Vec<ChatMessage>) -> Vec<ChatMessage> {
    let mut messages = vec![ChatMessage {
        role: "system".into(),
        content: build_system_prompt(),
    }];
    messages.extend(history);
    messages
}

// ---------- API Client ----------

#[derive(Debug)]
pub struct DeepSeekClient {
    http: reqwest::Client,
    api_key: String,
    model: String,
    temperature: f32,
    max_tokens: u32,
}

impl DeepSeekClient {
    pub fn new(api_key: String, model: String, temperature: f32, max_tokens: u32) -> Self {
        Self {
            http: reqwest::Client::builder()
                .timeout(Duration::from_secs(120))
                .build()
                .expect("Reqwest client build failed"),
            api_key,
            model,
            temperature,
            max_tokens,
        }
    }

    /// Non-streaming chat (for simple queries or retry)
    pub async fn chat(&self, messages: Vec<ChatMessage>) -> Result<ChatResponse, String> {
        let body = ChatRequest {
            model: self.model.clone(),
            messages,
            stream: false,
            temperature: Some(self.temperature),
            max_tokens: Some(self.max_tokens),
        };

        let resp = self
            .http
            .post(format!("{}/chat/completions", API_BASE))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("API request failed: {e}"))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("API error {status}: {text}"));
        }

        resp.json::<ChatResponse>()
            .await
            .map_err(|e| format!("Failed to parse response: {e}"))
    }

    /// Streaming chat — sends chunks via Tauri event system
    pub async fn chat_stream(
        &self,
        messages: Vec<ChatMessage>,
        app_handle: tauri::AppHandle,
    ) -> Result<(), String> {
        let body = ChatRequest {
            model: self.model.clone(),
            messages,
            stream: true,
            temperature: Some(self.temperature),
            max_tokens: Some(self.max_tokens),
        };

        let resp = self
            .http
            .post(format!("{}/chat/completions", API_BASE))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("Accept", "text/event-stream")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Stream request failed: {e}"))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("API error {status}: {text}"));
        }

        let mut stream = resp.bytes_stream();
        let mut buffer = String::new();

        // Track final usage stats (from last chunk)
        let mut total_input = 0u32;
        let mut total_output = 0u32;
        let mut total_cached = 0u32;

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result.map_err(|e| format!("Stream error: {e}"))?;
            let text = String::from_utf8_lossy(&chunk);
            buffer.push_str(&text);

            // Process complete SSE events from buffer
            while let Some(line_end) = buffer.find('\n') {
                let line = buffer[..line_end].trim().to_string();
                buffer = buffer[line_end + 1..].to_string();

                if line.starts_with("data: ") {
                    let data = &line[6..];

                    if data == "[DONE]" {
                        // Emit final chunk with usage
                        let _ = app_handle.emit("chat-chunk", StreamChunk {
                            content: String::new(),
                            finish_reason: Some("stop".into()),
                            input_tokens: total_input,
                            output_tokens: total_output,
                            cache_hit_tokens: total_cached,
                            done: true,
                        });
                        return Ok(());
                    }

                    // Parse JSON from SSE data
                    if let Ok(sse) = serde_json::from_str::<serde_json::Value>(data) {
                        let choices = sse["choices"].as_array();
                        if let Some(choices) = choices {
                            for choice in choices {
                                let delta = &choice["delta"];
                                let content = delta["content"].as_str().unwrap_or("");
                                let finish = choice["finish_reason"].as_str();

                                // Track usage from stream end
                                if let Some(usage) = sse["usage"].as_object() {
                                    total_input = usage["prompt_tokens"].as_u64().unwrap_or(0) as u32;
                                    total_output = usage["completion_tokens"].as_u64().unwrap_or(0) as u32;
                                    if let Some(details) = usage["prompt_tokens_details"].as_object() {
                                        total_cached = details["cached_tokens"].as_u64().unwrap_or(0) as u32;
                                    }
                                }

                                let chunk = StreamChunk {
                                    content: content.to_string(),
                                    finish_reason: finish.map(|s| s.to_string()),
                                    input_tokens: total_input,
                                    output_tokens: total_output,
                                    cache_hit_tokens: total_cached,
                                    done: finish == Some("stop"),
                                };

                                let _ = app_handle.emit("chat-chunk", chunk);
                            }
                        }
                    }
                }
            }
        }

        // Stream ended without [DONE] — emit done signal
        let _ = app_handle.emit("chat-chunk", StreamChunk {
            content: String::new(),
            finish_reason: Some("stop".into()),
            input_tokens: total_input,
            output_tokens: total_output,
            cache_hit_tokens: total_cached,
            done: true,
        });

        Ok(())
    }
}
