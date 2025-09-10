# Create MCP Client Connection

## Objective

Implement the MCP client connection to BrightData's hosted service with proper authentication and connection management.

## Context

- Sprint: 6
- Dependencies: prompt_03_express_server.md
- Related files: `/mcp-gateway/src/mcp-client.ts`

## Task

Create a robust MCP client that connects to BrightData's hosted MCP service and handles authentication, connection pooling, and error recovery.

### Requirements

1. Create `src/mcp-client.ts` with MCP client implementation
2. Configure connection to BrightData's MCP service:
   - Use WebSocket or HTTP transport as appropriate
   - Handle authentication with API keys
   - Implement connection retry logic
3. Implement client methods:
   - `connect()` - Establish connection
   - `listTools()` - Get available tools
   - `callTool()` - Execute tool with parameters
   - `disconnect()` - Clean shutdown
4. Add connection health monitoring:
   - Heartbeat/ping mechanism
   - Reconnection on failure
   - Circuit breaker pattern
5. Handle MCP protocol specifics:
   - Proper message formatting
   - Request/response correlation
   - Error code mapping

### Client Interface

```typescript
// Expected interface:
class MCPClient {
  async connect(): Promise<void>;
  async listTools(): Promise<Tool[]>;
  async callTool(name: string, params: any): Promise<any>;
  async disconnect(): Promise<void>;
  isConnected(): boolean;
}
```

## Agent to Use

Invoke the **@brightdata** agent to:

- Review MCP client implementation patterns
- Suggest authentication and connection best practices
- Validate error handling for MCP protocol
- Guide on BrightData-specific connection requirements

## Success Criteria

- [ ] MCP client successfully connects to BrightData
- [ ] Authentication works with provided credentials
- [ ] Can list available tools from BrightData service
- [ ] Tool execution returns proper responses
- [ ] Connection resilience handles network issues
- [ ] Proper cleanup on shutdown

## Notes

- Store credentials in environment variables
- Implement exponential backoff for retries
- Log all MCP communication for debugging
- Handle both success and error responses
