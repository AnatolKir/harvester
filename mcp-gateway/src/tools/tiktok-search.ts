import { Tool } from '../types';
import { logger } from '../utils/logger';
import { z } from 'zod';
import axios from 'axios';

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
      
      // Map our parameters to Bright Data format and call HTTP API directly
      const brightDataParams = mapToBrightDataParams(validatedParams);
      const searchResults = await executeBrightDataHttp(brightDataParams);
      
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
 * Execute search using Bright Data HTTP API
 */
async function executeBrightDataHttp(params: Record<string, unknown>): Promise<any[]> {
  try {
    const apiToken: string =
      process.env.API_TOKEN ?? process.env.BRIGHTDATA_API_KEY ?? '';
    if (apiToken.length === 0) throw new Error('Missing Bright Data API token');

    // Use Bright Data request API to fetch a TikTok promoted feed via Google site search as fallback
    // This is a pragmatic approach while keeping the interface stable
    const query = encodeURIComponent(
      `${String((params as any).query ?? '')} site:tiktok.com \/video\/ (#ad OR sponsored)`
    );
    const googleUrl = `https://www.google.com/search?q=${query}`;

    const resp = await axios.post(
      'https://api.brightdata.com/request',
      {
        url: googleUrl,
        zone: process.env.WEB_UNLOCKER_ZONE ?? 'mcp_unlocker',
        format: 'raw',
      },
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        responseType: 'text',
        timeout: 20000,
      }
    );

    const html = String(resp.data || '');
    // Very simple extraction of TikTok video URLs from SERP HTML
    const urlRegex = /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.-]+\/video\/(\d+)/g;
    const seen = new Set<string>();
    const out: Array<{ url: string; video_id: string; title?: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = urlRegex.exec(html)) !== null && m[1] && m[0]) {
      const videoId: string = String(m[1]);
      const url: string = String(m[0]);
      if (!seen.has(videoId)) {
        seen.add(videoId);
        out.push({ url, video_id: videoId });
      }
      const limit =
        typeof (params as any).limit === 'number' ? (params as any).limit : 0;
      if (limit > 0 && out.length >= limit) break;
    }

    return out;
  } catch (error: any) {
    // Check for rate limiting
    if (error.code === 429 || error.message?.includes('rate limit')) {
      const retryAfter = parseInt(error.headers?.['retry-after'] || '60');
      throw new RateLimitError(retryAfter);
    }
    
    logger.error('Bright Data HTTP error', error?.response?.data || error?.message);
    throw new Error('BrightData service error');
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
      const url: string = String(result.url ?? result.link ?? '');
      const title: string = String(result.title ?? result.description ?? 'Untitled');
      const author: string = String(result.author ?? result.creator ?? result.username ?? 'Unknown');
      const viewsRaw: string = String(result.views ?? result.view_count ?? '0');
      const video: VideoResult = {
        id: extractVideoId(url),
        url,
        title,
        author,
        view_count: parseInt(viewsRaw),
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