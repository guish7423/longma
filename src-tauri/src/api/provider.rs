use serde::{Deserialize, Serialize};
use std::time::Duration;

// ---------- Shared Types ----------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub input_price_per_m: f64,
    pub output_price_per_m: f64,
    pub cached_input_price_per_m: f64,
    pub supports_streaming: bool,
    pub supports_reasoning: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamChunk {
    pub content: String,
    pub reasoning_content: Option<String>,
    pub finish_reason: Option<String>,
    #[serde(default)]
    pub input_tokens: u32,
    #[serde(default)]
    pub output_tokens: u32,
    #[serde(default)]
    pub cache_hit_tokens: u32,
    pub done: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatResponse {
    pub content: String,
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub cache_hit_tokens: u32,
}

// ---------- Model Definitions ----------

pub fn builtin_models() -> Vec<ModelInfo> {
    vec![
        // DeepSeek models
        ModelInfo {
            id: "deepseek-chat".into(),
            name: "DeepSeek V4 Flash".into(),
            provider: "deepseek".into(),
            input_price_per_m: 0.07,
            output_price_per_m: 0.28,
            cached_input_price_per_m: 0.006,
            supports_streaming: true,
            supports_reasoning: false,
        },
        ModelInfo {
            id: "deepseek-reasoner".into(),
            name: "DeepSeek V4 Pro".into(),
            provider: "deepseek".into(),
            input_price_per_m: 0.50,
            output_price_per_m: 2.00,
            cached_input_price_per_m: 0.05,
            supports_streaming: true,
            supports_reasoning: true,
        },
        // OpenAI models
        ModelInfo {
            id: "gpt-4o".into(),
            name: "GPT-4o".into(),
            provider: "openai".into(),
            input_price_per_m: 2.50,
            output_price_per_m: 10.00,
            cached_input_price_per_m: 1.25,
            supports_streaming: true,
            supports_reasoning: false,
        },
        ModelInfo {
            id: "gpt-4o-mini".into(),
            name: "GPT-4o Mini".into(),
            provider: "openai".into(),
            input_price_per_m: 0.15,
            output_price_per_m: 0.60,
            cached_input_price_per_m: 0.075,
            supports_streaming: true,
            supports_reasoning: false,
        },
        // OpenAI reasoning models
        ModelInfo {
            id: "o3-mini".into(),
            name: "O3 Mini".into(),
            provider: "openai".into(),
            input_price_per_m: 1.10,
            output_price_per_m: 4.40,
            cached_input_price_per_m: 0.55,
            supports_streaming: true,
            supports_reasoning: true,
        },
        ModelInfo {
            id: "o4-mini".into(),
            name: "O4 Mini".into(),
            provider: "openai".into(),
            input_price_per_m: 1.10,
            output_price_per_m: 4.40,
            cached_input_price_per_m: 0.55,
            supports_streaming: true,
            supports_reasoning: true,
        },
        // Anthropic models
        ModelInfo {
            id: "claude-sonnet-4-20250514".into(),
            name: "Claude Sonnet 4".into(),
            provider: "anthropic".into(),
            input_price_per_m: 3.00,
            output_price_per_m: 15.00,
            cached_input_price_per_m: 0.30,
            supports_streaming: true,
            supports_reasoning: false,
        },
        ModelInfo {
            id: "claude-haiku-3-5-20241022".into(),
            name: "Claude Haiku 3.5".into(),
            provider: "anthropic".into(),
            input_price_per_m: 0.80,
            output_price_per_m: 4.00,
            cached_input_price_per_m: 0.08,
            supports_streaming: true,
            supports_reasoning: false,
        },
    ]
}

// ---------- Provider Client (enum dispatch) ----------

pub enum ProviderKind {
    DeepSeek,
    OpenAI,
    Anthropic,
}

impl ProviderKind {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "deepseek" => Some(Self::DeepSeek),
            "openai" => Some(Self::OpenAI),
            "anthropic" => Some(Self::Anthropic),
            _ => None,
        }
    }

    pub fn name(&self) -> &'static str {
        match self {
            Self::DeepSeek => "deepseek",
            Self::OpenAI => "openai",
            Self::Anthropic => "anthropic",
        }
    }
}

pub struct ProviderClient {
    pub kind: ProviderKind,
    pub api_key: String,
    pub base_url: String,
    http: reqwest::Client,
}

impl ProviderClient {
    pub fn new(kind: ProviderKind, api_key: String, base_url: Option<String>) -> Self {
        let default_url = match &kind {
            ProviderKind::DeepSeek => "https://api.deepseek.com".into(),
            ProviderKind::OpenAI => "https://api.openai.com".into(),
            ProviderKind::Anthropic => "https://api.anthropic.com".into(),
        };
        Self {
            kind,
            api_key,
            base_url: base_url.unwrap_or(default_url),
            http: reqwest::Client::builder()
                .timeout(Duration::from_secs(120))
                .build()
                .expect("Reqwest client build failed"),
        }
    }

    /// Non-streaming chat
    pub async fn chat(
        &self,
        messages: Vec<ChatMessage>,
        model: &str,
    ) -> Result<ChatResponse, String> {
        match self.kind {
            ProviderKind::DeepSeek | ProviderKind::OpenAI => {
                self.chat_openai_compat(messages, model, false).await
            }
            ProviderKind::Anthropic => {
                self.chat_anthropic(messages, model, false).await
            }
        }
    }

    /// Streaming chat — sends chunks via Tauri event system
    pub async fn chat_stream(
        &self,
        messages: Vec<ChatMessage>,
        model: &str,
        app_handle: tauri::AppHandle,
    ) -> Result<(), String> {
        match self.kind {
            ProviderKind::DeepSeek | ProviderKind::OpenAI => {
                self.chat_stream_openai_compat(messages, model, app_handle).await
            }
            ProviderKind::Anthropic => {
                self.chat_stream_anthropic(messages, model, app_handle).await
            }
        }
    }

    // ─── OpenAI-compatible (DeepSeek, OpenAI, etc.) ───

    async fn chat_openai_compat(
        &self,
        messages: Vec<ChatMessage>,
        model: &str,
        stream: bool,
    ) -> Result<ChatResponse, String> {
        #[derive(Serialize)]
        struct Request {
            model: String,
            messages: Vec<ChatMessage>,
            stream: bool,
        }

        #[derive(Deserialize)]
        struct Response {
            choices: Vec<Choice>,
            usage: Option<Usage>,
        }

        #[derive(Deserialize)]
        struct Choice {
            message: Message,
        }

        #[derive(Deserialize)]
        struct Message {
            content: Option<String>,
        }

        #[derive(Deserialize)]
        struct Usage {
            prompt_tokens: u32,
            completion_tokens: u32,
            prompt_tokens_details: Option<PromptDetails>,
        }

        #[derive(Deserialize, Default)]
        struct PromptDetails {
            #[serde(default)]
            cached_tokens: u32,
        }

        let body = Request {
            model: model.to_string(),
            messages,
            stream,
        };

        let resp = self
            .http
            .post(format!("{}/v1/chat/completions", self.base_url.trim_end_matches('/')))
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

        let r: Response = resp.json().await.map_err(|e| format!("Parse error: {e}"))?;
        let content = r.choices.first()
            .and_then(|c| c.message.content.clone())
            .unwrap_or_default();
        let usage = r.usage.unwrap_or(Usage {
            prompt_tokens: 0,
            completion_tokens: 0,
            prompt_tokens_details: None,
        });
        let cached = usage.prompt_tokens_details
            .as_ref()
            .map(|d| d.cached_tokens)
            .unwrap_or(0);

        Ok(ChatResponse {
            content,
            input_tokens: usage.prompt_tokens,
            output_tokens: usage.completion_tokens,
            cache_hit_tokens: cached,
        })
    }

    async fn chat_stream_openai_compat(
        &self,
        messages: Vec<ChatMessage>,
        model: &str,
        app_handle: tauri::AppHandle,
    ) -> Result<(), String> {
        use futures_util::StreamExt;
        use tauri::Emitter;

        #[derive(Serialize)]
        struct Request {
            model: String,
            messages: Vec<ChatMessage>,
            stream: bool,
            #[serde(skip_serializing_if = "Option::is_none")]
            max_tokens: Option<u32>,
        }

        let body = Request {
            model: model.to_string(),
            messages,
            stream: true,
            max_tokens: Some(4096),
        };

        let resp = self
            .http
            .post(format!("{}/v1/chat/completions", self.base_url.trim_end_matches('/')))
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
        let mut total_input = 0u32;
        let mut total_output = 0u32;
        let mut total_cached = 0u32;
        let mut reasoning_buffer = String::new();

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result.map_err(|e| format!("Stream error: {e}"))?;
            let text = String::from_utf8_lossy(&chunk);
            buffer.push_str(&text);

            while let Some(line_end) = buffer.find('\n') {
                let line = buffer[..line_end].trim().to_string();
                buffer = buffer[line_end + 1..].to_string();

                if line.starts_with("data: ") {
                    let data = &line[6..];
                    if data == "[DONE]" {
                        let _ = app_handle.emit("chat-chunk", StreamChunk {
                            content: String::new(),
                            reasoning_content: None,
                            finish_reason: Some("stop".into()),
                            input_tokens: total_input,
                            output_tokens: total_output,
                            cache_hit_tokens: total_cached,
                            done: true,
                        });
                        return Ok(());
                    }

                    if let Ok(sse) = serde_json::from_str::<serde_json::Value>(data) {
                        if let Some(choices) = sse["choices"].as_array() {
                            for choice in choices {
                                let delta = &choice["delta"];
                                let content = delta["content"].as_str().unwrap_or("");
                                let reasoning = delta["reasoning_content"].as_str();

                                // Track reasoning content (DeepSeek R1 style)
                                if let Some(r) = reasoning {
                                    reasoning_buffer.push_str(r);
                                }

                                let finish = choice["finish_reason"].as_str();

                                // Track usage
                                if let Some(usage) = sse["usage"].as_object() {
                                    total_input = usage["prompt_tokens"].as_u64().unwrap_or(0) as u32;
                                    total_output = usage["completion_tokens"].as_u64().unwrap_or(0) as u32;
                                    if let Some(details) = usage["prompt_tokens_details"].as_object() {
                                        total_cached = details["cached_tokens"].as_u64().unwrap_or(0) as u32;
                                    }
                                }

                                let reasoning = if reasoning_buffer.is_empty() {
                                    None
                                } else {
                                    Some(reasoning_buffer.clone())
                                };

                                let _ = app_handle.emit("chat-chunk", StreamChunk {
                                    content: content.to_string(),
                                    reasoning_content: reasoning,
                                    finish_reason: finish.map(|s| s.to_string()),
                                    input_tokens: total_input,
                                    output_tokens: total_output,
                                    cache_hit_tokens: total_cached,
                                    done: finish == Some("stop"),
                                });
                            }
                        }
                    }
                }
            }
        }

        let _ = app_handle.emit("chat-chunk", StreamChunk {
            content: String::new(),
            reasoning_content: None,
            finish_reason: Some("stop".into()),
            input_tokens: total_input,
            output_tokens: total_output,
            cache_hit_tokens: total_cached,
            done: true,
        });

        Ok(())
    }

    // ─── Anthropic API ───

    async fn chat_anthropic(
        &self,
        messages: Vec<ChatMessage>,
        model: &str,
        _stream: bool,
    ) -> Result<ChatResponse, String> {
        #[derive(Serialize)]
        struct AnthropicRequest {
            model: String,
            max_tokens: u32,
            messages: Vec<AnthropicMessage>,
        }

        #[derive(Serialize)]
        struct AnthropicMessage {
            role: String,
            content: String,
        }

        #[derive(Deserialize)]
        struct AnthropicResponse {
            content: Vec<AnthropicContent>,
            usage: AnthropicUsage,
        }

        #[derive(Deserialize)]
        struct AnthropicContent {
            text: Option<String>,
        }

        #[derive(Deserialize)]
        struct AnthropicUsage {
            input_tokens: u32,
            output_tokens: u32,
        }

        let ant_messages: Vec<AnthropicMessage> = messages
            .into_iter()
            .map(|m| AnthropicMessage {
                role: m.role,
                content: m.content,
            })
            .collect();

        let body = AnthropicRequest {
            model: model.to_string(),
            max_tokens: 4096,
            messages: ant_messages,
        };

        let resp = self
            .http
            .post(format!("{}/v1/messages", self.base_url.trim_end_matches('/')))
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Anthropic API error: {e}"))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("Anthropic API error {status}: {text}"));
        }

        let r: AnthropicResponse = resp.json().await.map_err(|e| format!("Parse error: {e}"))?;
        let content = r.content.first()
            .and_then(|c| c.text.clone())
            .unwrap_or_default();

        Ok(ChatResponse {
            content,
            input_tokens: r.usage.input_tokens,
            output_tokens: r.usage.output_tokens,
            cache_hit_tokens: 0,
        })
    }

    async fn chat_stream_anthropic(
        &self,
        _messages: Vec<ChatMessage>,
        _model: &str,
        _app_handle: tauri::AppHandle,
    ) -> Result<(), String> {
        // Anthropic SSE streaming is more complex (different event format)
        // For now, fall back to non-streaming
        Err("Anthropic streaming not yet implemented, use non-streaming chat".into())
    }
}
