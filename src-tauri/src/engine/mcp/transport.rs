// MCP Transport Layer — Stdio (subprocess) + HTTP (JSON-RPC over POST)

use super::types::*;
use serde_json;
use std::collections::HashMap;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};

// ─── Transport Enum ───────────────────────────────────────────────

pub enum McpTransport {
    Stdio(StdioTransport),
    Http(HttpTransport),
}

impl McpTransport {
    pub async fn connect(&mut self) -> Result<(), String> {
        match self {
            McpTransport::Stdio(t) => t.connect().await,
            McpTransport::Http(t) => t.connect().await,
        }
    }

    pub async fn send_request(&mut self, request: &JsonRpcRequest) -> Result<JsonRpcResponse, String> {
        match self {
            McpTransport::Stdio(t) => t.send_request(request).await,
            McpTransport::Http(t) => t.send_request(request).await,
        }
    }

    pub async fn close(&mut self) -> Result<(), String> {
        match self {
            McpTransport::Stdio(t) => t.close().await,
            McpTransport::Http(t) => t.close().await,
        }
    }
}

// ─── Stdio Transport ──────────────────────────────────────────────

pub struct StdioTransport {
    command: String,
    args: Vec<String>,
    env: HashMap<String, String>,
    child: Option<Child>,
    stdin: Option<tokio::process::ChildStdin>,
    stdout_reader: Option<tokio::io::Lines<BufReader<tokio::process::ChildStdout>>>,
    #[allow(dead_code)]
    next_id: u64,
}

impl StdioTransport {
    pub fn new(command: &str, args: Vec<String>, env: HashMap<String, String>) -> Self {
        Self {
            command: command.to_string(),
            args,
            env,
            child: None,
            stdin: None,
            stdout_reader: None,
            next_id: 1,
        }
    }

    async fn connect(&mut self) -> Result<(), String> {
        let mut cmd = Command::new(&self.command);
        cmd.args(&self.args)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::inherit()); // Show stderr for debugging

        // Set environment variables
        for (key, value) in &self.env {
            cmd.env(key, value);
        }

        let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn MCP server '{}': {}", self.command, e))?;

        let stdin = child.stdin.take().ok_or("Failed to open stdin for MCP server")?;
        let stdout = child.stdout.take().ok_or("Failed to open stdout for MCP server")?;
        let reader = BufReader::new(stdout).lines();

        self.child = Some(child);
        self.stdin = Some(stdin);
        self.stdout_reader = Some(reader);

        Ok(())
    }

    async fn send_request(&mut self, request: &JsonRpcRequest) -> Result<JsonRpcResponse, String> {
        let stdin = self.stdin.as_mut().ok_or("MCP server not connected")?;

        // Serialize and write request as single JSON line
        let request_json = serde_json::to_string(request)
            .map_err(|e| format!("Failed to serialize request: {e}"))?;

        stdin.write_all(request_json.as_bytes()).await
            .map_err(|e| format!("Failed to write to MCP server stdin: {e}"))?;
        stdin.write_all(b"\n").await
            .map_err(|e| format!("Failed to write newline to MCP server stdin: {e}"))?;

        // Read response line from stdout
        let reader = self.stdout_reader.as_mut().ok_or("MCP server stdout reader not available")?;

        let mut attempts = 0;
        loop {
            let line = reader.next_line().await
                .map_err(|e| format!("Failed to read from MCP server stdout: {e}"))?;

            match line {
                None => {
                    // EOF — check if process is still alive
                    if let Some(ref mut child) = self.child {
                        match child.try_wait() {
                            Ok(Some(status)) => {
                                return Err(format!("MCP server process exited with status {status}"));
                            }
                            Ok(None) => {} // Still running
                            Err(e) => return Err(format!("Error checking MCP server status: {e}")),
                        }
                    }
                    attempts += 1;
                    if attempts > 50 {
                        return Err("MCP server: no response after 50 empty reads".into());
                    }
                    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                    continue;
                }
                Some(line) => {
                    let trimmed = line.trim();
                    if trimmed.is_empty() {
                        continue;
                    }

                    let response: JsonRpcResponse = serde_json::from_str(trimmed)
                        .map_err(|e| format!("Failed to parse MCP response '{}': {e}", &trimmed[..trimmed.len().min(200)]))?;

                    // Match by ID — skip notifications or unmatched IDs
                    if response.id == request.id {
                        return Ok(response);
                    }
                    // Otherwise, it might be a notification or old response — continue reading
                }
            }
        }
    }

    async fn close(&mut self) -> Result<(), String> {
        if let Some(mut child) = self.child.take() {
            // Try graceful shutdown
            let _ = child.kill().await;
            let _ = child.wait().await;
        }
        self.stdin = None;
        self.stdout_reader = None;
        Ok(())
    }
}

// ─── HTTP Transport ───────────────────────────────────────────────

pub struct HttpTransport {
    base_url: String,
    client: reqwest::Client,
}

impl HttpTransport {
    pub fn new(url: &str) -> Self {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .unwrap_or_default();

        Self {
            base_url: url.trim_end_matches('/').to_string(),
            client,
        }
    }

    async fn connect(&mut self) -> Result<(), String> {
        // HTTP transport is stateless; just verify connectivity
        // The actual init happens during send_request
        Ok(())
    }

    async fn send_request(&mut self, request: &JsonRpcRequest) -> Result<JsonRpcResponse, String> {
        let url = format!("{}/", self.base_url);

        let response = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(request)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {e}"))?;

        if !response.status().is_success() {
            return Err(format!("HTTP error {}: {}", response.status(), response.text().await.unwrap_or_default()));
        }

        let json: serde_json::Value = response.json().await
            .map_err(|e| format!("Failed to parse HTTP response: {e}"))?;

        // The response could be a single JSON-RPC response or a batch
        let response: JsonRpcResponse = serde_json::from_value(json)
            .map_err(|e| format!("Failed to parse MCP JSON-RPC response: {e}"))?;

        Ok(response)
    }

    async fn close(&mut self) -> Result<(), String> {
        // HTTP transport: nothing to close
        Ok(())
    }
}
