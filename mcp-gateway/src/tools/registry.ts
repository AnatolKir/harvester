import { Tool } from '../types';
import { logger } from '../utils/logger';
import tiktokSearchTool from './tiktok-search';

/**
 * Tool Registry - Manages all custom tools available in the MCP gateway
 */
class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  
  constructor() {
    this.registerDefaultTools();
  }
  
  /**
   * Register default tools on initialization
   */
  private registerDefaultTools(): void {
    // Register TikTok search tool
    this.register(tiktokSearchTool);
    
    // Future tools will be registered here
    // this.register(tiktokCommentsTool);
    // this.register(tiktokVideoDetailsTool);
    
    logger.info({
      message: 'Tool registry initialized',
      toolsRegistered: Array.from(this.tools.keys()),
    });
  }
  
  /**
   * Register a new tool
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      logger.warn({
        message: 'Tool already registered, overwriting',
        toolName: tool.name,
      });
    }
    
    this.tools.set(tool.name, tool);
    
    logger.info({
      message: 'Tool registered',
      toolName: tool.name,
      description: tool.description,
    });
  }
  
  /**
   * Get a tool by name
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }
  
  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }
  
  /**
   * Get all registered tools
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Get tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
  
  /**
   * Execute a tool by name with parameters
   */
  async execute(toolName: string, params: unknown): Promise<unknown> {
    const tool = this.get(toolName);
    
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    
    const startTime = Date.now();
    
    try {
      logger.info({
        message: 'Executing tool',
        toolName,
        params,
      });
      
      const result = await tool.handler(params);
      
      const executionTime = Date.now() - startTime;
      logger.info({
        message: 'Tool execution completed',
        toolName,
        executionTime,
      });
      
      return result;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error({
        message: 'Tool execution failed',
        toolName,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
      });
      
      throw error;
    }
  }
  
  /**
   * Get tool metadata for discovery
   */
  getToolMetadata(): Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }> {
    return this.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }
}

// Create singleton instance
export const toolRegistry = new ToolRegistry();

export default toolRegistry;