import { Tool } from '../types';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

// Input schema for the TikTok search tool
const TikTokSearchParamsSchema = z.object({
  keywords: z.string().optional().describe('Search keywords for finding videos'),
  limit: z.number().min(1).max(50).default(10).describe('Maximum number of results'),
  country: z.string().default('US').describe('Country code for geo-targeting'),
  content_type: z.enum(['promoted', 'all']).default('promoted').describe('Filter for content type'),
});

// Output schema for video results
const VideoResultSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  title: z.string(),
  author: z.string(),
  view_count: z.number(),
  is_promoted: z.boolean(),
  discovered_at: z.string().datetime(),
});

export type TikTokSearchParams = z.infer<typeof TikTokSearchParamsSchema>;
export type VideoResult = z.infer<typeof VideoResultSchema>;

/**
 * TikTok Search Tool - Finds TikTok promoted videos for U.S. market
 * Maps our custom parameters to BrightData's TikTok search capabilities
 */
export const tiktokSearchTool: Tool = {
  name: 'tiktok.ccl.search',
  description: 'Search for TikTok promoted videos in the U.S. market',
  inputSchema: TikTokSearchParamsSchema.shape as Record<string, unknown>,
  
  handler: async (params: unknown): Promise<VideoResult[]> => {
    const startTime = Date.now();
    
    try {
      // Validate input parameters
      const validatedParams = TikTokSearchParamsSchema.parse(params);
      
      logger.info({
        message: 'TikTok search request received',
        params: validatedParams,
      });
      
      // Initialize BrightData MCP client
      const client = await initializeBrightDataClient();
      
      // Map our parameters to BrightData's search format
      const brightDataParams = mapToBrightDataParams(validatedParams);
      
      // Execute search using BrightData
      const searchResults = await executeBrightDataSearch(client, brightDataParams);
      
      // Filter and transform results
      const videos = transformSearchResults(searchResults, validatedParams);
      
      // Log success metrics
      const executionTime = Date.now() - startTime;
      logger.info({
        message: 'TikTok search completed',
        videosFound: videos.length,
        executionTime,
        params: validatedParams,
      });
      
      return videos;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Handle specific error types
      if (error instanceof z.ZodError) {
        logger.error({
          message: 'Invalid parameters for TikTok search',
          error: error.errors,
          executionTime,
        });
        throw new Error(`Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`);
      }
      
      if (error instanceof RateLimitError) {
        logger.warn({
          message: 'Rate limit reached for TikTok search',
          retryAfter: error.retryAfter,
          executionTime,
        });
        throw new Error(`Rate limit exceeded. Please retry after ${error.retryAfter} seconds`);
      }
      
      // Log unexpected errors
      logger.error({
        message: 'TikTok search failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
      });
      
      throw error;
    }
  },
};

/**
 * Execute command helper
 */
const execAsync = promisify(exec);

/**
 * Initialize BrightData connection (simplified for MVP)
 */
async function initializeBrightDataClient(): Promise<any> {
  // For MVP, we'll use direct API calls or command execution
  // This is a placeholder that returns a mock client
  return {
    request: async (params: any) => {
      // This would be replaced with actual BrightData API calls
      logger.info('BrightData request', params);
      return executeBrightDataCommand(params);
    }
  };
}

/**
 * Execute BrightData command via CLI
 */
async function executeBrightDataCommand(params: any): Promise<any> {
  try {
    // Build command for BrightData MCP
    const command = `npx -y @brightdata/mcp call ${JSON.stringify(params)}`;
    
    const { stdout, stderr } = await execAsync(command, {
      env: {
        ...process.env,
        BRIGHTDATA_API_KEY: process.env.BRIGHTDATA_API_KEY || '',
      },
    });
    
    if (stderr) {
      logger.warn('BrightData command stderr:', stderr);
    }
    
    return JSON.parse(stdout);
  } catch (error) {
    logger.error('Failed to execute BrightData command', error);
    throw new Error('BrightData service error');
  }
}

/**
 * Map our search parameters to BrightData's expected format
 */
function mapToBrightDataParams(params: TikTokSearchParams): Record<string, unknown> {
  const brightDataParams: Record<string, unknown> = {
    engine: 'tiktok',
    query: params.keywords || '',
    limit: params.limit,
    country: params.country.toLowerCase(),
  };
  
  // Add promoted content filtering if specified
  if (params.content_type === 'promoted') {
    brightDataParams.filters = {
      is_promoted: true,
      has_product_link: true,
    };
  }
  
  return brightDataParams;
}

/**
 * Execute search using BrightData's search_engine tool
 */
async function executeBrightDataSearch(
  client: any,
  params: Record<string, unknown>
): Promise<any[]> {
  try {
    const result = await client.request({
      method: 'tools/call',
      params: {
        name: 'search_engine',
        arguments: params,
      },
    });
    
    // Extract results from response
    if (result.content && Array.isArray(result.content)) {
      return result.content;
    }
    
    return [];
  } catch (error: any) {
    // Check for rate limiting
    if (error.code === 429 || error.message?.includes('rate limit')) {
      const retryAfter = parseInt(error.headers?.['retry-after'] || '60');
      throw new RateLimitError(retryAfter);
    }
    
    throw error;
  }
}

/**
 * Transform BrightData results to our VideoResult format
 */
function transformSearchResults(
  results: any[],
  params: TikTokSearchParams
): VideoResult[] {
  const videos: VideoResult[] = [];
  
  for (const result of results) {
    try {
      // Skip non-promoted content if filtering is enabled
      if (params.content_type === 'promoted' && !isPromotedContent(result)) {
        continue;
      }
      
      // Transform to our format
      const video: VideoResult = {
        id: extractVideoId(result.url || result.link || ''),
        url: result.url || result.link || '',
        title: result.title || result.description || 'Untitled',
        author: result.author || result.creator || result.username || 'Unknown',
        view_count: parseInt(result.views || result.view_count || '0'),
        is_promoted: isPromotedContent(result),
        discovered_at: new Date().toISOString(),
      };
      
      // Validate transformed result
      const validatedVideo = VideoResultSchema.parse(video);
      videos.push(validatedVideo);
      
    } catch (error) {
      logger.warn({
        message: 'Failed to transform search result',
        result,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  return videos;
}

/**
 * Extract TikTok video ID from URL
 */
function extractVideoId(url: string): string {
  // TikTok URL patterns:
  // https://www.tiktok.com/@username/video/1234567890
  // https://vm.tiktok.com/ZMxxxxxxx/
  
  const patterns = [
    /\/video\/(\d+)/,
    /\/v\/(\d+)/,
    /tiktok\.com\/(\w+)$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // Fallback to hash of URL if no ID found
  return Buffer.from(url).toString('base64').slice(0, 16);
}

/**
 * Check if content is promoted/sponsored
 */
function isPromotedContent(result: any): boolean {
  // Check various indicators of promoted content
  const promotedIndicators = [
    result.is_promoted === true,
    result.is_ad === true,
    result.sponsored === true,
    result.has_product_link === true,
    /\#ad\b/i.test(result.description || ''),
    /\#sponsored/i.test(result.description || ''),
    /promoted/i.test(result.label || ''),
  ];
  
  return promotedIndicators.some(indicator => indicator);
}

/**
 * Custom error class for rate limiting
 */
class RateLimitError extends Error {
  constructor(public retryAfter: number) {
    super(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
    this.name = 'RateLimitError';
  }
}

// Export for registration in the gateway
export default tiktokSearchTool;