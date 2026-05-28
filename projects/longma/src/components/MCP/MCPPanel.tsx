import { useState, useEffect, useCallback } from 'react';

interface McpServerConfig {
  name: string;
  transport: 'stdio' | 'http';
  command?: string;
  args: string[];
  url?: string;
  env: Record<string, string>;
}

interface McpServerStatus {
  name: string;
  transport: 'stdio' | 'http';
  connected: boolean;
  tools_count: number;
  error: string | null;
}

interface McpTool {
  name: string;
  description: string;
  input_schema: any;
}

interface McpToolResult {
  content: { type: string; text?: string; data?: string; mime_type?: string }[];
  is_error?: boolean;
}

export default function MCPPanel() {
  const [servers, setServers] = useState<McpServerStatus[]>([]);
  const [configs, setConfigs] = useState<McpServerConfig[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [toolResult, setToolResult] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Add form state
  const [formName, setFormName] = useState('');
  const [formTransport, setFormTransport] = useState<'stdio' | 'http'>('stdio');
  const [formCommand, setFormCommand] = useState('');
  const [formArgs, setFormArgs] = useState('');
  const [formUrl, setFormUrl] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const [status, cfg] = await Promise.all([
        invoke<McpServerStatus[]>('list_mcp_status'),
        invoke<McpServerConfig[]>('list_mcp_servers'),
      ]);
      setServers(status);
      setConfigs(cfg);
    } catch (e) {
      console.error('Failed to load MCP status:', e);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleConnect = async (name: string) => {
    setConnecting(name);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const config = configs.find(c => c.name === name);
      if (!config) throw new Error(`Config for '${name}' not found`);
      await invoke('connect_mcp_server', { config });
      await loadStatus();
      if (selectedServer === name) {
        const tools = await invoke<[string, McpTool][]>('list_mcp_tools');
        const serverTools = tools
          .filter(([server]) => server === name)
          .map(([, tool]) => tool);
        setTools(serverTools);
      }
    } catch (e: any) {
      console.error('Connect failed:', e);
    }
    setConnecting(null);
  };

  const handleDisconnect = async (name: string) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('disconnect_mcp_server', { name });
      if (selectedServer === name) {
        setSelectedServer(null);
        setTools([]);
      }
      await loadStatus();
    } catch (e) {
      console.error('Disconnect failed:', e);
    }
  };

  const handleSelectServer = async (name: string) => {
    setSelectedServer(name);
    setToolResult('');
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const allTools = await invoke<[string, McpTool][]>('list_mcp_tools');
      const serverTools = allTools
        .filter(([server]) => server === name)
        .map(([, tool]) => tool);
      setTools(serverTools);
    } catch (e) {
      setTools([]);
    }
  };

  const handleCallTool = async (toolName: string) => {
    if (!selectedServer) return;
    setLoading(true);
    setToolResult('');
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<McpToolResult>('call_mcp_tool', {
        serverName: selectedServer,
        toolName,
        args: {},
      });
      const text = result.content
        .map(c => c.type === 'text' ? c.text : c.type === 'image' ? `[Image: ${c.mime_type}]` : '[Resource]')
        .filter(Boolean)
        .join('\n---\n');
      setToolResult(text || '(empty result)');
    } catch (e: any) {
      setToolResult(`Error: ${e}`);
    }
    setLoading(false);
  };

  const handleAddServer = async () => {
    if (!formName.trim()) return;
    const newConfig: McpServerConfig = {
      name: formName.trim(),
      transport: formTransport,
      command: formTransport === 'stdio' ? formCommand.trim() || undefined : undefined,
      args: formTransport === 'stdio' ? formArgs.split(' ').filter(Boolean) : [],
      url: formTransport === 'http' ? formUrl.trim() || undefined : undefined,
      env: {},
    };

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const updated = [...configs, newConfig];
      await invoke('update_config', { mcpServers: updated });
      setShowAddForm(false);
      setFormName('');
      setFormCommand('');
      setFormArgs('');
      setFormUrl('');
      await loadStatus();
    } catch (e: any) {
      console.error('Failed to add server:', e);
    }
  };

  const handleRemoveServer = async (name: string) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const updated = configs.filter(c => c.name !== name);
      await invoke('update_config', { mcpServers: updated });
      if (selectedServer === name) {
        setSelectedServer(null);
        setTools([]);
      }
      await loadStatus();
    } catch (e) {
      console.error('Failed to remove server:', e);
    }
  };

  const connectedServers = servers.filter(s => s.connected);
  const disconnectedServers = configs.filter(c => !servers.find(s => s.name === c.name)?.connected);

  return (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--accent-primary)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: 6 }}>
            <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" />
          </svg>
          MCP Servers
        </h3>
        <button onClick={() => setShowAddForm(!showAddForm)} className="click-scale"
          style={{
            padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-default)',
            background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
            fontSize: 11, cursor: 'pointer', fontWeight: 600,
          }}>
          + Add
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div style={{
          padding: 12, borderRadius: 10, marginBottom: 12,
          background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column', gap: 8,
          animation: 'fadeSlideIn 200ms ease both',
        }}>
          <input value={formName} onChange={e => setFormName(e.target.value)}
            placeholder="Server name" style={inputStyle()} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setFormTransport('stdio')}
              style={tabStyle(formTransport === 'stdio')}>STDIO</button>
            <button onClick={() => setFormTransport('http')}
              style={tabStyle(formTransport === 'http')}>HTTP</button>
          </div>
          {formTransport === 'stdio' ? (
            <>
              <input value={formCommand} onChange={e => setFormCommand(e.target.value)}
                placeholder="Command (e.g., npx)" style={inputStyle()} />
              <input value={formArgs} onChange={e => setFormArgs(e.target.value)}
                placeholder="Args (e.g., -y @modelcontextprotocol/server-filesystem /tmp)" style={inputStyle()} />
            </>
          ) : (
            <input value={formUrl} onChange={e => setFormUrl(e.target.value)}
              placeholder="URL (e.g., http://localhost:3000/mcp)" style={inputStyle()} />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAddServer}
              style={{
                flex: 1, padding: '6px 12px', borderRadius: 6, border: 'none',
                background: 'var(--accent-primary)', color: '#fff', fontSize: 12, cursor: 'pointer',
              }}>Save</button>
            <button onClick={() => setShowAddForm(false)}
              style={{
                padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
              }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Server List */}
      <div style={{ flex: connectedServers.length === 0 && tools.length === 0 ? 1 : '0 0 auto', overflow: 'auto', marginBottom: 12 }}>
        {configs.length === 0 && !showAddForm && (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 24 }}>
            No MCP servers configured. Click "+ Add" to add one.
          </div>
        )}
        {connectedServers.map(s => (
          <ServerRow key={s.name} server={s} isSelected={s.name === selectedServer}
            onSelect={() => handleSelectServer(s.name)}
            onDisconnect={() => handleDisconnect(s.name)}
            onRemove={() => handleRemoveServer(s.name)} />
        ))}
        {disconnectedServers.map(c => {
          const existingStatus = servers.find(s => s.name === c.name);
          return (
            <ServerRow key={c.name}
              server={{
                name: c.name,
                transport: c.transport,
                connected: false,
                tools_count: 0,
                error: existingStatus?.error || null,
              }}
              connecting={connecting === c.name}
              onConnect={() => handleConnect(c.name)}
              onRemove={() => handleRemoveServer(c.name)} />
          );
        })}
      </div>

      {/* Tool Browser */}
      {selectedServer && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
              {selectedServer} · {tools.length} tools
            </div>
          </div>
          {tools.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 11, padding: 8 }}>
              {servers.find(s => s.name === selectedServer)?.connected
                ? 'No tools available'
                : 'Connect server to browse tools'}
            </div>
          ) : (
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {tools.map(t => (
                <div key={t.name} style={{
                  padding: '6px 10px', borderRadius: 6,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }} onClick={() => handleCallTool(t.name)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace' }}>
                      {t.name}
                    </span>
                    <button style={{
                      padding: '2px 6px', borderRadius: 4, border: 'none',
                      background: 'rgba(79,111,255,0.15)', color: 'var(--accent)',
                      fontSize: 10, cursor: 'pointer',
                    }}>Call</button>
                  </div>
                  {t.description && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {t.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {loading && (
            <div style={{ color: 'var(--text-muted)', fontSize: 11, padding: 8 }}>
              Calling tool...
            </div>
          )}
          {toolResult && (
            <div style={{
              marginTop: 8, padding: 10, borderRadius: 6,
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              maxHeight: 200, overflow: 'auto', fontSize: 11, fontFamily: 'monospace',
              color: 'var(--text-primary)', whiteSpace: 'pre-wrap',
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Result:</div>
              {toolResult}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ServerRow({ server, isSelected, onSelect, onConnect, onDisconnect, onRemove, connecting }: {
  server: McpServerStatus & { transport: string };
  isSelected?: boolean;
  onSelect?: () => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onRemove?: () => void;
  connecting?: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className="hover-lift"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px', borderRadius: 6, marginBottom: 2,
        cursor: onSelect ? 'pointer' : 'default',
        background: isSelected ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
        border: isSelected ? '1px solid var(--border-accent)' : '1px solid var(--border)',
      }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: server.connected ? 'var(--success)' : 'var(--text-muted)',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
          {server.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {server.transport} {server.connected ? `· ${server.tools_count} tools` : server.error ? `· ${server.error}` : ''}
        </div>
      </div>
      {onConnect && (
        <button onClick={(e) => { e.stopPropagation(); onConnect(); }}
          disabled={connecting}
          style={{
            padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--accent)', fontSize: 10,
            cursor: 'pointer',
          }}>
          {connecting ? '...' : 'Connect'}
        </button>
      )}
      {onDisconnect && (
        <button onClick={(e) => { e.stopPropagation(); onDisconnect(); }}
          style={{
            padding: '3px 8px', borderRadius: 4, border: 'none',
            background: 'transparent', color: 'var(--text-muted)', fontSize: 10,
            cursor: 'pointer',
          }}>
          ✕
        </button>
      )}
      {onRemove && !server.connected && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            padding: '2px 6px', borderRadius: 4, border: 'none',
            background: 'transparent', color: 'var(--error)', fontSize: 10,
            cursor: 'pointer',
          }}>
          del
        </button>
      )}
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
    background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
    fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box',
  };
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1, padding: '5px 10px', borderRadius: 4, border: 'none',
    background: active ? 'var(--accent)' : 'var(--bg-tertiary)',
    color: active ? '#fff' : 'var(--text-secondary)',
    fontSize: 11, cursor: 'pointer', fontWeight: active ? 600 : 400,
  };
}
