// MCP Client — manages connections to MCP servers

use super::transport::McpTransport;
use super::types::*;
use std::collections::HashMap;
use std::sync::Arc;

/// A connected MCP server session
pub struct McpSession {
    pub config: McpServerConfig,
    pub transport: McpTransport,
    pub tools: Vec<McpTool>,
    pub connected: bool,
}

impl McpSession {
    /// Initialize connection: connect transport → initialize → list tools
    pub async fn connect(&mut self) -> Result<(), String> {
        self.transport.connect().await?;

        // Send initialize request
        let init_req = JsonRpcRequest::initialize("LongMa", "0.1.0", 1);
        let init_resp = self.transport.send_request(&init_req).await?;

        if let Some(err) = init_resp.error {
            return Err(format!("MCP initialization error: {} (code {})", err.message, err.code));
        }

        // Send initialized notification (fire-and-forget)
        let notif = JsonRpcRequest::initialized(2);
        let _ = self.transport.send_request(&notif).await;

        // Discover tools
        self.refresh_tools().await?;
        self.connected = true;
        Ok(())
    }

    /// Refresh the tool list from the server
    pub async fn refresh_tools(&mut self) -> Result<(), String> {
        let list_req = JsonRpcRequest::list_tools(3);
        let list_resp = self.transport.send_request(&list_req).await?;

        if let Some(err) = list_resp.error {
            return Err(format!("MCP tools/list error: {} (code {})", err.message, err.code));
        }

        // Parse tools from response
        if let Some(result) = &list_resp.result {
            if let Some(tools_array) = result.get("tools").and_then(|v| v.as_array()) {
                let tools: Vec<McpTool> = tools_array
                    .iter()
                    .filter_map(|v| serde_json::from_value(v.clone()).ok())
                    .collect();
                self.tools = tools;
                return Ok(());
            }
        }

        Ok(())
    }

    /// Call a tool and return the result
    pub async fn call_tool(&mut self, tool_name: &str, args: serde_json::Value) -> Result<McpToolResult, String> {
        // Check that the tool exists
        let tool = self.tools.iter().find(|t| t.name == tool_name)
            .ok_or_else(|| format!("Tool '{}' not found on server '{}'", tool_name, self.config.name))?;

        let req = JsonRpcRequest::call_tool(4, &tool.name, args);
        let resp = self.transport.send_request(&req).await?;

        if let Some(err) = resp.error {
            return Err(format!("MCP tool call error: {} (code {})", err.message, err.code));
        }

        if let Some(result) = &resp.result {
            let tool_result: McpToolResult = serde_json::from_value(result.clone())
                .map_err(|e| format!("Failed to parse MCP tool result: {e}"))?;
            Ok(tool_result)
        } else {
            Ok(McpToolResult {
                content: vec![],
                is_error: None,
            })
        }
    }

    /// Disconnect from the server
    pub async fn disconnect(&mut self) -> Result<(), String> {
        self.transport.close().await?;
        self.connected = false;
        self.tools.clear();
        Ok(())
    }
}

// ─── MCP Server Manager ───────────────────────────────────────────

pub struct McpManager {
    /// Map of server name → session
    sessions: HashMap<String, McpSession>,
}

impl McpManager {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }

    /// Create a transport from config
    fn create_transport(config: &McpServerConfig) -> McpTransport {
        match config.transport {
            McpTransportType::Stdio => {
                let cmd = config.command.clone().unwrap_or_else(|| "npx".into());
                McpTransport::Stdio(super::transport::StdioTransport::new(
                    &cmd,
                    config.args.clone(),
                    config.env.clone(),
                ))
            }
            McpTransportType::Http => {
                let url = config.url.clone().unwrap_or_else(|| "http://localhost:3000".into());
                McpTransport::Http(super::transport::HttpTransport::new(&url))
            }
        }
    }

    /// Connect to a server by config
    pub async fn connect(&mut self, config: McpServerConfig) -> Result<(), String> {
        let name = config.name.clone();

        // Disconnect existing session if any
        if self.sessions.contains_key(&name) {
            self.disconnect(&name).await?;
        }

        let transport = Self::create_transport(&config);
        let mut session = McpSession {
            config,
            transport,
            tools: vec![],
            connected: false,
        };

        session.connect().await?;
        self.sessions.insert(name, session);
        Ok(())
    }

    /// Disconnect from a server
    pub async fn disconnect(&mut self, name: &str) -> Result<(), String> {
        if let Some(mut session) = self.sessions.remove(name) {
            session.disconnect().await?;
        }
        Ok(())
    }

    /// List tools from all connected servers
    pub fn list_all_tools(&self) -> Vec<(String, McpTool)> {
        let mut all_tools = Vec::new();
        for (server_name, session) in &self.sessions {
            if session.connected {
                for tool in &session.tools {
                    all_tools.push((server_name.clone(), tool.clone()));
                }
            }
        }
        all_tools
    }

    /// Get status of all servers
    pub fn list_status(&self) -> Vec<McpServerStatus> {
        self.sessions
            .iter()
            .map(|(name, session)| McpServerStatus {
                name: name.clone(),
                transport: session.config.transport.clone(),
                connected: session.connected,
                tools_count: session.tools.len(),
                error: None,
            })
            .collect()
    }

    /// Get status of a single server
    pub fn get_status(&self, name: &str) -> Option<McpServerStatus> {
        self.sessions.get(name).map(|session| McpServerStatus {
            name: name.to_string(),
            transport: session.config.transport.clone(),
            connected: session.connected,
            tools_count: session.tools.len(),
            error: None,
        })
    }

    /// Refresh tools for a specific server
    pub async fn refresh_tools(&mut self, name: &str) -> Result<(), String> {
        if let Some(session) = self.sessions.get_mut(name) {
            session.refresh_tools().await
        } else {
            Err(format!("Server '{}' not connected", name))
        }
    }

    /// Call a tool on a specific server
    pub async fn call_tool(
        &mut self,
        server_name: &str,
        tool_name: &str,
        args: serde_json::Value,
    ) -> Result<McpToolResult, String> {
        if let Some(session) = self.sessions.get_mut(server_name) {
            session.call_tool(tool_name, args).await
        } else {
            Err(format!("Server '{}' not connected", server_name))
        }
    }
}

// ─── Thread-safe wrapper for Tauri ────────────────────────────────

pub type SharedMcpManager = Arc<tokio::sync::Mutex<McpManager>>;

pub fn create_shared_manager() -> SharedMcpManager {
    Arc::new(tokio::sync::Mutex::new(McpManager::new()))
}
