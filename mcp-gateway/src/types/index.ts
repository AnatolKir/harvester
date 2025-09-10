export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (params: unknown) => Promise<unknown>;
}

export interface MCPRequest {
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  id: string;
  result?: unknown;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

export interface ToolExecutionRequest {
  tool: string;
  params: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface ToolExecutionResponse {
  tool: string;
  result?: unknown;
  error?: string;
  executionTime: number;
  timestamp: number;
}