import { Tool } from '../types';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

// Input schema for the TikTok comments tool
const CommentsParamsSchema = z.object({
  video_url: z.string().url().describe('TikTok video URL to fetch comments from'),
  page: z.number().min(1).max(2).default(1).describe('Page number (1-2 max per MVP constraints)'),
  limit: z.number().min(10).max(100).default(50).describe('Number of comments per page'),
  sort: z.enum(['newest', 'popular']).default('popular').describe('Comment sorting method'),
});

// Output schema for comment results
const CommentResultSchema = z.object({
  id: z.string(),
  text: z.string(),
  author: z.string(),
  created_at: z.string().datetime(),
  likes_count: z.number(),
  replies_count: z.number(),
});

const CommentsResponseSchema = z.object({
  comments: z.array(CommentResultSchema),
  pagination: z.object({
    page: z.number(),
    has_more: z.boolean(),
    total_count: z.number().optional(),
  }),
});

export type CommentsParams = z.infer<typeof CommentsParamsSchema>;
export type CommentResult = z.infer<typeof CommentResultSchema>;
export type CommentsResponse = z.infer<typeof CommentsResponseSchema>;

/**
 * TikTok Comments Page Tool - Retrieves paginated comments from TikTok videos
 * Maps our custom parameters to BrightData's comment extraction capabilities
 */
export const tiktokCommentsPageTool: Tool = {
  name: 'tiktok.comments.page',
  description: 'Get paginated comments from a TikTok video using BrightData service',
  inputSchema: CommentsParamsSchema.shape as Record<string, unknown>,
  
  handler: async (params: unknown): Promise<CommentsResponse> => {
    const startTime = Date.now();
    
    try {
      // Validate input parameters
      const validatedParams = CommentsParamsSchema.parse(params);
      
      // Enforce MVP constraint: max 2 pages
      if (validatedParams.page > 2) {
        throw new Error('Page number exceeds MVP limit of 2 pages per video');
      }
      
      logger.info({
        message: 'TikTok comments request received',
        params: validatedParams,
      });
      
      // Initialize BrightData MCP client
      const client = await initializeBrightDataClient();
      
      // Map our parameters to BrightData's format
      const brightDataParams = mapToBrightDataParams(validatedParams);
      
      // Execute comment extraction using BrightData
      const commentsData = await executeBrightDataComments(client, brightDataParams);
      
      // Transform and validate results
      const response = transformCommentsResponse(commentsData, validatedParams);
      
      // Log success metrics
      const executionTime = Date.now() - startTime;
      logger.info({
        message: 'TikTok comments extraction completed',
        videoUrl: validatedParams.video_url,
        commentsFound: response.comments.length,
        page: response.pagination.page,
        hasMore: response.pagination.has_more,
        executionTime,
      });
      
      return response;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Handle specific error types
      if (error instanceof z.ZodError) {
        logger.error({
          message: 'Invalid parameters for TikTok comments',
          error: error.errors,
          executionTime,
        });
        throw new Error(`Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`);
      }
      
      if (error instanceof RateLimitError) {
        logger.warn({
          message: 'Rate limit reached for TikTok comments',
          retryAfter: error.retryAfter,
          executionTime,
        });
        throw new Error(`Rate limit exceeded. Please retry after ${error.retryAfter} seconds`);
      }
      
      if (error instanceof VideoNotFoundError) {
        logger.warn({
          message: 'Video not found or private',
          videoUrl: (params as any)?.video_url,
          executionTime,
        });
        throw new Error('Video not found, private, or deleted');
      }
      
      // Log unexpected errors
      logger.error({
        message: 'TikTok comments extraction failed',
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
  return {
    request: async (params: any) => {
      logger.info('BrightData comments request', params);
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
      timeout: 30000, // 30 second timeout for comment extraction
    });
    
    if (stderr) {
      logger.warn('BrightData command stderr:', stderr);
    }
    
    return JSON.parse(stdout);
  } catch (error: any) {
    // Check for timeout
    if (error.code === 'ETIMEDOUT' || error.killed) {
      throw new Error('Comment extraction timed out');
    }
    
    logger.error('Failed to execute BrightData command', error);
    throw new Error('BrightData service error');
  }
}

/**
 * Map our comment parameters to BrightData's expected format
 */
function mapToBrightDataParams(params: CommentsParams): Record<string, unknown> {
  // Extract video ID from URL
  const videoId = extractVideoIdFromUrl(params.video_url);
  
  const brightDataParams: Record<string, unknown> = {
    url: params.video_url,
    video_id: videoId,
    page: params.page,
    limit: params.limit,
    sort_by: params.sort === 'newest' ? 'recent' : 'top',
    // Focus on top-level comments per MVP constraints
    include_replies: false,
  };
  
  return brightDataParams;
}

/**
 * Execute comment extraction using BrightData
 */
async function executeBrightDataComments(
  client: any,
  params: Record<string, unknown>
): Promise<any> {
  try {
    const result = await client.request({
      method: 'tools/call',
      params: {
        name: 'scrape_as_markdown', // BrightData's scraping tool
        arguments: {
          url: params.url,
          // Additional scraping parameters for comments
          selector: 'comments',
          pagination: {
            page: params.page,
            limit: params.limit,
          },
        },
      },
    });
    
    // Check if video exists
    if (result.error?.includes('404') || result.error?.includes('not found')) {
      throw new VideoNotFoundError();
    }
    
    // Extract comments from response
    if (result.content) {
      return parseCommentsFromContent(result.content);
    }
    
    return { comments: [], has_more: false };
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
 * Parse comments from BrightData's scraped content
 */
function parseCommentsFromContent(content: any): any {
  // Handle different response formats from BrightData
  if (typeof content === 'string') {
    // Parse markdown or HTML content
    return parseCommentsFromMarkdown(content);
  }
  
  if (Array.isArray(content)) {
    return { comments: content, has_more: content.length >= 50 };
  }
  
  if (content.comments) {
    return content;
  }
  
  return { comments: [], has_more: false };
}

/**
 * Parse comments from markdown/HTML content
 */
function parseCommentsFromMarkdown(content: string): any {
  const comments: any[] = [];
  
  // Simple regex patterns to extract comment data
  // This would be refined based on actual BrightData response format
  const commentPattern = /### @(\w+).*?\n(.*?)(?:\n|$)/g;
  const likesPattern = /(\d+) likes/i;
  const datePattern = /(\d{4}-\d{2}-\d{2})/;
  
  let match;
  while ((match = commentPattern.exec(content)) !== null) {
    const author = match[1] || 'Unknown';
    const text = match[2]?.trim() || '';
    
    // Extract likes count
    const likesMatch = text.match(likesPattern);
    const likes = likesMatch && likesMatch[1] ? parseInt(likesMatch[1]) : 0;
    
    // Extract or generate date
    const dateMatch = text.match(datePattern);
    const date = dateMatch && dateMatch[1] ? new Date(dateMatch[1]) : new Date();
    
    comments.push({
      id: generateCommentId(author, text),
      author,
      text: text.replace(likesPattern, '').trim(),
      likes_count: likes,
      created_at: date.toISOString(),
      replies_count: 0, // MVP: no reply threads
    });
  }
  
  return {
    comments,
    has_more: comments.length >= 50,
  };
}

/**
 * Transform BrightData response to our format
 */
function transformCommentsResponse(
  data: any,
  params: CommentsParams
): CommentsResponse {
  const comments: CommentResult[] = [];
  
  // Process each comment
  for (const item of data.comments || []) {
    try {
      const comment: CommentResult = {
        id: item.id || generateCommentId(item.author || 'unknown', item.text || ''),
        text: item.text || item.content || '',
        author: item.author || item.username || item.user?.username || 'Unknown',
        created_at: normalizeDateTime(item.created_at || item.timestamp || item.date),
        likes_count: parseInt(item.likes || item.likes_count || '0'),
        replies_count: parseInt(item.replies || item.replies_count || '0'),
      };
      
      // Validate and add comment
      const validatedComment = CommentResultSchema.parse(comment);
      comments.push(validatedComment);
      
    } catch (error) {
      logger.warn({
        message: 'Failed to transform comment',
        item,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  // Build response with pagination
  const response: CommentsResponse = {
    comments,
    pagination: {
      page: params.page,
      has_more: data.has_more || (comments.length >= params.limit && params.page < 2),
      total_count: data.total_count,
    },
  };
  
  return response;
}

/**
 * Extract video ID from TikTok URL
 */
function extractVideoIdFromUrl(url: string): string {
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
  
  // Fallback to URL hash if no ID found
  return Buffer.from(url).toString('base64').slice(0, 16);
}

/**
 * Generate a unique comment ID
 */
function generateCommentId(author: string, text: string): string {
  const hash = Buffer.from(`${author}-${text.slice(0, 50)}-${Date.now()}`)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 16);
  return `comment_${hash}`;
}

/**
 * Normalize various date formats to ISO string
 */
function normalizeDateTime(dateInput: any): string {
  if (!dateInput) {
    return new Date().toISOString();
  }
  
  // Handle various date formats
  if (typeof dateInput === 'string') {
    const date = new Date(dateInput);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  
  if (typeof dateInput === 'number') {
    // Handle Unix timestamps
    const date = new Date(dateInput * (dateInput < 10000000000 ? 1000 : 1));
    return date.toISOString();
  }
  
  return new Date().toISOString();
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

/**
 * Custom error class for video not found
 */
class VideoNotFoundError extends Error {
  constructor() {
    super('Video not found, private, or deleted');
    this.name = 'VideoNotFoundError';
  }
}

// Export for registration in the gateway
export default tiktokCommentsPageTool;