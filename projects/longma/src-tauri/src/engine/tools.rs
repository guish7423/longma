use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

// ─── Tool Definition ──────────────────────────────────────────

/// A callable tool available to the agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    pub name: String,
    pub description: String,
    pub parameters: HashMap<String, ToolParam>,
    pub timeout_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolParam {
    pub param_type: String,
    pub description: String,
    pub required: bool,
}

/// A concrete tool invocation produced by the model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub tool_name: String,
    pub arguments: serde_json::Value,
    pub timestamp: String,
}

/// The result of executing a ToolCall
#[derive(Debug, Clone, Serialize)]
pub struct ToolResult {
    pub call_id: String,
    pub tool_name: String,
    pub status: ToolStatus,
    pub output: String,
    pub duration_ms: u64,
    pub retry_count: u32,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub enum ToolStatus {
    Success,
    Timeout,
    ExecutionFailed(String),
    RateLimited,
    InvalidParameters(String),
}

impl std::fmt::Display for ToolStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ToolStatus::Success => write!(f, "success"),
            ToolStatus::Timeout => write!(f, "timeout"),
            ToolStatus::ExecutionFailed(_) => write!(f, "execution_failed"),
            ToolStatus::RateLimited => write!(f, "rate_limited"),
            ToolStatus::InvalidParameters(_) => write!(f, "invalid_parameters"),
        }
    }
}

// ─── Failure Mode Detection & Repair ──────────────────────────

/// Analysis of a tool call failure
#[derive(Debug, Clone)]
pub struct FailureAnalysis {
    pub failure_mode: ToolStatus,
    pub is_recoverable: bool,
    pub repair_strategy: RepairStrategy,
}

/// Strategy for repairing a failed tool call
#[derive(Debug, Clone)]
pub enum RepairStrategy {
    /// Retry with same parameters (for transient failures)
    Retry,
    /// Retry with backoff (for rate limits)
    RetryWithBackoff { delay_ms: u64, max_retries: u32 },
    /// Fix parameters and retry
    FixParameters { suggested_fix: String },
    /// Cannot recover — inform model
    ReportFailure(String),
}

impl RepairStrategy {
    pub fn should_retry(&self) -> bool {
        matches!(self, RepairStrategy::Retry | RepairStrategy::RetryWithBackoff { .. } | RepairStrategy::FixParameters { .. })
    }
}

/// Analyze a failure and determine the repair strategy
pub fn analyze_failure(
    call: &ToolCall,
    status: &ToolStatus,
    retry_count: u32,
) -> FailureAnalysis {
    match status {
        ToolStatus::Timeout => {
            FailureAnalysis {
                failure_mode: ToolStatus::Timeout,
                is_recoverable: retry_count < 3,
                repair_strategy: if retry_count < 3 {
                    RepairStrategy::Retry
                } else {
                    RepairStrategy::ReportFailure(
                        format!("Tool '{}' timed out after {} retries", call.tool_name, retry_count)
                    )
                },
            }
        }
        ToolStatus::ExecutionFailed(err) => {
            let recoverable_patterns = [
                "connection refused",
                "connection reset",
                "temporary failure",
                "try again",
                "server error",
                "500",
                "503",
                "service unavailable",
            ];

            let is_recoverable = recoverable_patterns.iter()
                .any(|p| err.to_lowercase().contains(p))
                && retry_count < 3;

            FailureAnalysis {
                failure_mode: ToolStatus::ExecutionFailed(err.clone()),
                is_recoverable,
                repair_strategy: if is_recoverable {
                    RepairStrategy::RetryWithBackoff {
                        delay_ms: 1000u64 * (retry_count as u64 + 1),
                        max_retries: 3,
                    }
                } else {
                    RepairStrategy::ReportFailure(format!(
                        "Tool '{}' failed with unrecoverable error: {}", call.tool_name, err
                    ))
                },
            }
        }
        ToolStatus::RateLimited => {
            let delay = if retry_count < 3 { 2000u64 } else { 5000u64 };
            FailureAnalysis {
                failure_mode: ToolStatus::RateLimited,
                is_recoverable: retry_count < 5,
                repair_strategy: RepairStrategy::RetryWithBackoff {
                    delay_ms: delay * (retry_count as u64 + 1),
                    max_retries: 5,
                },
            }
        }
        ToolStatus::InvalidParameters(detail) => {
            FailureAnalysis {
                failure_mode: ToolStatus::InvalidParameters(detail.clone()),
                is_recoverable: false,
                repair_strategy: RepairStrategy::ReportFailure(format!(
                    "Invalid parameters for '{}': {}. Awaiting model correction.",
                    call.tool_name, detail
                )),
            }
        }
        ToolStatus::Success => unreachable!("Cannot analyze success as failure"),
    }
}

// ─── Tool Execution Engine ────────────────────────────────────

/// Registered tool implementations (simulated for now — will connect to MCP later)
pub struct ToolEngine {
    tools: HashMap<String, Tool>,
    retry_history: HashMap<String, Vec<(ToolStatus, Instant)>>,
}

impl ToolEngine {
    pub fn new() -> Self {
        Self {
            tools: HashMap::from([
                (
                    "read_file".into(),
                    Tool {
                        name: "read_file".into(),
                        description: "Read a file from the local filesystem".into(),
                        parameters: HashMap::from([
                            ("path".into(), ToolParam {
                                param_type: "string".into(),
                                description: "Absolute path to the file".into(),
                                required: true,
                            }),
                        ]),
                        timeout_ms: 5_000,
                    },
                ),
                (
                    "search_code".into(),
                    Tool {
                        name: "search_code".into(),
                        description: "Search for patterns in the codebase".into(),
                        parameters: HashMap::from([
                            ("pattern".into(), ToolParam {
                                param_type: "string".into(),
                                description: "Search pattern (regex supported)".into(),
                                required: true,
                            }),
                            ("path".into(), ToolParam {
                                param_type: "string".into(),
                                description: "Directory to search (optional)".into(),
                                required: false,
                            }),
                        ]),
                        timeout_ms: 10_000,
                    },
                ),
                (
                    "run_command".into(),
                    Tool {
                        name: "run_command".into(),
                        description: "Execute a shell command".into(),
                        parameters: HashMap::from([
                            ("command".into(), ToolParam {
                                param_type: "string".into(),
                                description: "Command to execute".into(),
                                required: true,
                            }),
                        ]),
                        timeout_ms: 30_000,
                    },
                ),
                (
                    "web_search".into(),
                    Tool {
                        name: "web_search".into(),
                        description: "Search the web for current information".into(),
                        parameters: HashMap::from([
                            ("query".into(), ToolParam {
                                param_type: "string".into(),
                                description: "Search query".into(),
                                required: true,
                            }),
                        ]),
                        timeout_ms: 15_000,
                    },
                ),
                (
                    "read_memory".into(),
                    Tool {
                        name: "read_memory".into(),
                        description: "Read from LongMa's persistent memory".into(),
                        parameters: HashMap::from([
                            ("query".into(), ToolParam {
                                param_type: "string".into(),
                                description: "Memory search query".into(),
                                required: true,
                            }),
                            ("category".into(), ToolParam {
                                param_type: "string".into(),
                                description: "Memory category (optional)".into(),
                                required: false,
                            }),
                        ]),
                        timeout_ms: 3_000,
                    },
                ),
                (
                    "write_memory".into(),
                    Tool {
                        name: "write_memory".into(),
                        description: "Write an observation to LongMa's persistent memory".into(),
                        parameters: HashMap::from([
                            ("content".into(), ToolParam {
                                param_type: "string".into(),
                                description: "Content to remember".into(),
                                required: true,
                            }),
                            ("category".into(), ToolParam {
                                param_type: "string".into(),
                                description: "Memory category".into(),
                                required: true,
                            }),
                        ]),
                        timeout_ms: 3_000,
                    },
                ),
            ]),
            retry_history: HashMap::new(),
        }
    }

    /// Get a registered tool by name
    pub fn get_tool(&self, name: &str) -> Option<&Tool> {
        self.tools.get(name)
    }

    /// List all registered tools
    pub fn list_tools(&self) -> Vec<&Tool> {
        self.tools.values().collect()
    }

    /// Get the timeout for a tool call from its definition
    fn get_timeout(&self, tool_name: &str) -> u64 {
        self.tools.get(tool_name).map(|t| t.timeout_ms).unwrap_or(10_000)
    }

    /// Execute a tool call with full repair pipeline.
    pub fn execute_with_repair(&mut self, call: &ToolCall) -> ToolResult {
        let start = Instant::now();
        let mut retry_count = 0u32;
        let tool_timeout = self.get_timeout(&call.tool_name);

        loop {
            // 1. Validate parameters
            if let Err(detail) = self.validate_call(call) {
                return ToolResult {
                    call_id: call.id.clone(),
                    tool_name: call.tool_name.clone(),
                    status: ToolStatus::InvalidParameters(detail),
                    output: String::new(),
                    duration_ms: start.elapsed().as_millis() as u64,
                    retry_count,
                };
            }

            // 2. Execute (simulated)
            let exec_result = self.execute_call(call, tool_timeout);

            // 3. Check for success
            match exec_result {
                Ok(output) => {
                    return ToolResult {
                        call_id: call.id.clone(),
                        tool_name: call.tool_name.clone(),
                        status: ToolStatus::Success,
                        output,
                        duration_ms: start.elapsed().as_millis() as u64,
                        retry_count,
                    };
                }
                Err(status) => {
                    // 4. Analyze failure and determine repair
                    let analysis = analyze_failure(call, &status, retry_count);

                    // Track retry
                    self.retry_history
                        .entry(call.id.clone())
                        .or_default()
                        .push((status.clone(), Instant::now()));

                    // 5. Execute repair or report
                    match &analysis.repair_strategy {
                        RepairStrategy::Retry => {
                            retry_count += 1;
                            continue;
                        }
                        RepairStrategy::RetryWithBackoff { delay_ms, max_retries } => {
                            if retry_count < *max_retries {
                                retry_count += 1;
                                std::thread::sleep(Duration::from_millis(*delay_ms));
                                continue;
                            }
                            return ToolResult {
                                call_id: call.id.clone(),
                                tool_name: call.tool_name.clone(),
                                status,
                                output: format!("Exhausted {} retries", retry_count),
                                duration_ms: start.elapsed().as_millis() as u64,
                                retry_count,
                            };
                        }
                        RepairStrategy::FixParameters { .. } => {
                            retry_count += 1;
                            continue;
                        }
                        RepairStrategy::ReportFailure(msg) => {
                            return ToolResult {
                                call_id: call.id.clone(),
                                tool_name: call.tool_name.clone(),
                                status,
                                output: msg.clone(),
                                duration_ms: start.elapsed().as_millis() as u64,
                                retry_count,
                            };
                        }
                    }
                }
            }
        }
    }

    /// Validate tool call parameters
    fn validate_call(&self, call: &ToolCall) -> Result<(), String> {
        let tool = self.tools.get(&call.tool_name)
            .ok_or_else(|| format!("Unknown tool: {}", call.tool_name))?;

        let obj = call.arguments.as_object()
            .ok_or_else(|| "Arguments must be a JSON object".to_string())?;

        for (param_name, param) in &tool.parameters {
            if param.required && !obj.contains_key(param_name) {
                return Err(format!(
                    "Missing required parameter '{}' for tool '{}'",
                    param_name, call.tool_name
                ));
            }
        }

        Ok(())
    }

    /// Execute a single tool call (simulated — real MCP integration in Phase 3.2)
    fn execute_call(&self, call: &ToolCall, _timeout_ms: u64) -> Result<String, ToolStatus> {
        match call.tool_name.as_str() {
            "read_file" => {
                Ok(format!("[Simulated] Read file: {:?}", call.arguments))
            }
            "search_code" => {
                Ok(format!("[Simulated] Search results for pattern: {:?}", call.arguments))
            }
            "run_command" => {
                Ok(format!("[Simulated] Command output for: {:?}", call.arguments))
            }
            "web_search" => {
                Ok(format!("[Simulated] Web search results for: {:?}", call.arguments))
            }
            "read_memory" => {
                Ok(format!("[Simulated] Memory query results: {:?}", call.arguments))
            }
            "write_memory" => {
                Ok(format!("[Simulated] Memory written: {:?}", call.arguments))
            }
            _ => Err(ToolStatus::ExecutionFailed(format!("Unknown tool: {}", call.tool_name))),
        }
    }

    /// Get retry history for a specific call
    pub fn get_retry_history(&self, call_id: &str) -> Vec<(ToolStatus, Instant)> {
        self.retry_history.get(call_id).cloned().unwrap_or_default()
    }

    /// Clear retry history
    pub fn clear_history(&mut self) {
        self.retry_history.clear();
    }
}

// ─── Concurrent Tool Scheduler ────────────────────────────────

/// Execute multiple independent tool calls concurrently.
/// Uses Arc<Mutex<ToolEngine>> for safe shared access.
pub async fn execute_concurrent(
    engine: Arc<Mutex<ToolEngine>>,
    calls: Vec<ToolCall>,
) -> Vec<ToolResult> {
    let mut handles = Vec::with_capacity(calls.len());

    for call in calls {
        let engine_clone = engine.clone();
        let handle = tokio::spawn(async move {
            let mut eng = engine_clone.lock().unwrap();
            eng.execute_with_repair(&call)
        });
        handles.push(handle);
    }

    let mut results = Vec::with_capacity(handles.len());
    for handle in handles {
        match handle.await {
            Ok(result) => results.push(result),
            Err(e) => {
                results.push(ToolResult {
                    call_id: "unknown".into(),
                    tool_name: "unknown".into(),
                    status: ToolStatus::ExecutionFailed(format!("Join error: {}", e)),
                    output: String::new(),
                    duration_ms: 0,
                    retry_count: 0,
                });
            }
        }
    }

    results
}

/// Sequential execution of tool calls (simpler, no threading)
pub fn execute_sequential(engine: &mut ToolEngine, calls: &[ToolCall]) -> Vec<ToolResult> {
    calls.iter().map(|call| engine.execute_with_repair(call)).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_call(id: &str, tool: &str, args: serde_json::Value) -> ToolCall {
        ToolCall {
            id: id.into(),
            tool_name: tool.into(),
            arguments: args,
            timestamp: "2026-01-01T00:00:00Z".into(),
        }
    }

    #[test]
    fn test_tool_registration() {
        let engine = ToolEngine::new();
        assert!(engine.get_tool("read_file").is_some());
        assert!(engine.get_tool("search_code").is_some());
        assert!(engine.get_tool("nonexistent").is_none());
        assert_eq!(engine.list_tools().len(), 6);
    }

    #[test]
    fn test_validate_missing_required_param() {
        let engine = ToolEngine::new();
        let call = make_call("call_1", "read_file", serde_json::json!({}));
        let result = engine.validate_call(&call);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Missing required parameter 'path'"));
    }

    #[test]
    fn test_validate_unknown_tool() {
        let engine = ToolEngine::new();
        let call = make_call("call_2", "nonexistent", serde_json::json!({}));
        let result = engine.validate_call(&call);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unknown tool"));
    }

    #[test]
    fn test_execute_success() {
        let mut engine = ToolEngine::new();
        let call = make_call("test_success", "read_file", serde_json::json!({"path": "/tmp/test.txt"}));
        let result = engine.execute_with_repair(&call);
        assert!(matches!(result.status, ToolStatus::Success));
        assert_eq!(result.retry_count, 0);
    }

    #[test]
    fn test_execute_unknown_tool() {
        let mut engine = ToolEngine::new();
        let call = make_call("test_bad", "unknown_tool", serde_json::json!({}));
        let result = engine.execute_with_repair(&call);
        assert!(matches!(result.status, ToolStatus::InvalidParameters(_)));
    }

    #[test]
    fn test_sequential_execution() {
        let mut engine = ToolEngine::new();
        let calls = vec![
            make_call("c1", "read_file", serde_json::json!({"path": "/tmp/a.txt"})),
            make_call("c2", "read_memory", serde_json::json!({"query": "test", "category": "fact"})),
        ];
        let results = execute_sequential(&mut engine, &calls);
        assert_eq!(results.len(), 2);
        assert!(matches!(results[0].status, ToolStatus::Success));
        assert!(matches!(results[1].status, ToolStatus::Success));
    }

    #[test]
    fn test_failure_analysis_timeout() {
        let call = make_call("call_t", "read_file", serde_json::json!({"path": "/tmp/test"}));
        let analysis = analyze_failure(&call, &ToolStatus::Timeout, 0);
        assert!(analysis.is_recoverable);
        assert!(matches!(analysis.repair_strategy, RepairStrategy::Retry));

        let exhausted = analyze_failure(&call, &ToolStatus::Timeout, 3);
        assert!(!exhausted.is_recoverable);
    }

    #[test]
    fn test_failure_analysis_rate_limit() {
        let call = make_call("call_rl", "web_search", serde_json::json!({"query": "test"}));
        let analysis = analyze_failure(&call, &ToolStatus::RateLimited, 0);
        assert!(analysis.is_recoverable);
        assert!(matches!(analysis.repair_strategy, RepairStrategy::RetryWithBackoff { .. }));
    }
}
