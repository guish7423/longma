// MCP Protocol Types — JSON-RPC 2.0 + Model Context Protocol definitions

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ─── JSON-RPC 2.0 ─────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    pub id: u64,
    pub method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    pub id: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<JsonRpcError>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JsonRpcError {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

// ─── MCP Tool Definitions ─────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpTool {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub input_schema: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpToolResult {
    pub content: Vec<McpContentItem>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_error: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum McpContentItem {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "image")]
    Image { data: String, mime_type: String },
    #[serde(rename = "resource")]
    Resource { resource: McpResourceContents },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpResourceContents {
    pub uri: String,
    #[serde(default)]
    pub mime_type: String,
    pub text: Option<String>,
    pub blob: Option<String>,
}

// ─── Server Configuration ─────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum McpTransportType {
    #[serde(rename = "stdio")]
    Stdio,
    #[serde(rename = "http")]
    Http,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerConfig {
    pub name: String,
    pub transport: McpTransportType,
    /// For stdio: executable command (e.g., "npx", "node")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,
    /// For stdio: command arguments
    #[serde(default)]
    pub args: Vec<String>,
    /// For http: base URL
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    /// Optional environment variables
    #[serde(default)]
    pub env: HashMap<String, String>,
}

// ─── Runtime Status ───────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct McpServerStatus {
    pub name: String,
    pub transport: McpTransportType,
    pub connected: bool,
    pub tools_count: usize,
    pub error: Option<String>,
}

// ─── Helper builders ──────────────────────────────────────────────

impl JsonRpcRequest {
    pub fn new(id: u64, method: &str, params: Option<serde_json::Value>) -> Self {
        Self {
            jsonrpc: "2.0".into(),
            id,
            method: method.into(),
            params,
        }
    }

    pub fn initialize(client_name: &str, version: &str, id: u64) -> Self {
        Self::new(id, "initialize", Some(serde_json::json!({
            "protocolVersion": "2025-03-26",
            "capabilities": {},
            "clientInfo": {
                "name": client_name,
                "version": version,
            }
        })))
    }

    pub fn list_tools(id: u64) -> Self {
        Self::new(id, "tools/list", Some(serde_json::json!({})))
    }

    pub fn call_tool(id: u64, name: &str, args: serde_json::Value) -> Self {
        Self::new(id, "tools/call", Some(serde_json::json!({
            "name": name,
            "arguments": args,
        })))
    }

    pub fn initialized(id: u64) -> Self {
        Self {
            jsonrpc: "2.0".into(),
            id,
            method: "notifications/initialized".into(),
            params: None,
        }
    }
}
