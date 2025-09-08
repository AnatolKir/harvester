import type { Database } from "./database";

// ============================================================================
// CORE API RESPONSE TYPES
// ============================================================================

// Standard API response format
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    count?: number;
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}

// Paginated response format
export interface PaginatedApiResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Cursor-based paginated response format
export interface CursorPaginatedApiResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

// ============================================================================
// QUERY PARAMETER TYPES
// ============================================================================

// Pagination parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Cursor pagination parameters
export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
}

// Search parameters
export interface SearchParams {
  search?: string;
}

// Date filter parameters
export interface DateFilterParams {
  dateFilter?: "today" | "week" | "month" | "all";
}

// Sort parameters
export interface SortParams {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Combined filter parameters for domains
export interface DomainFilters
  extends PaginationParams,
    SearchParams,
    DateFilterParams,
    SortParams {
  sortBy?:
    | "domain"
    | "first_seen"
    | "last_seen"
    | "total_mentions"
    | "unique_videos";
}

// Combined filter parameters for videos
export interface VideoFilters extends CursorPaginationParams, SearchParams {
  status?: "all" | "pending" | "processing" | "completed" | "failed";
  hasComments?: boolean;
}

// ============================================================================
// DOMAIN TYPES
// ============================================================================

// Base domain type from database
export type Domain = Database["public"]["Tables"]["domain"]["Row"];

// View row: v_domains_overview
export interface DomainOverview {
  domain: string;
  total_mentions: number;
  first_seen: string;
  last_seen: string;
}

// View row: v_domains_new_today
export interface DomainNewToday {
  domain: string;
  mentions_today: number;
}

// View row: v_domain_mentions_recent
export interface DomainMentionRecent {
  domain: string;
  comment_id: string;
  video_id: string;
  created_at: string;
}

// View row: v_pipeline_stats
export interface PipelineStats {
  domains_day: number;
  comments_day: number;
  errors_day: number;
}

// Domain mention type
export type DomainMention =
  Database["public"]["Tables"]["domain_mention"]["Row"];

// Domain with recent mentions and time series data
export interface DomainDetails extends Domain {
  recent_mentions: Array<{
    id: string;
    comment_id?: string | null;
    video_id?: string | null;
    created_at: string;
    video?: {
      id: string;
      video_id: string;
      title: string | null;
      url: string;
    };
    comment?: {
      id: string;
      content: string;
      author_username: string;
      video: {
        id: string;
        video_id: string;
        title: string | null;
        url: string;
      };
    };
  }>;
  time_series: Array<{
    date: string;
    mention_count: number;
  }>;
}

// Trending domain data
export interface TrendingDomain {
  domain: string;
  growth: number;
  mentions: number;
  domain_id?: string;
}

// ============================================================================
// VIDEO TYPES
// ============================================================================

// Base video type from database
export type Video = Database["public"]["Tables"]["video"]["Row"];

// Video with domain statistics
export interface VideoWithDomains extends Video {
  domain_count: number;
  domains: Array<{
    id: string;
    domain: string;
    mention_count: number;
  }>;
  comment_count_with_domains: number;
}

// ============================================================================
// COMMENT TYPES
// ============================================================================

// Base comment type from database
export type Comment = Database["public"]["Tables"]["comment"]["Row"];

// ============================================================================
// DASHBOARD AND STATS TYPES
// ============================================================================

// Processing status for jobs
export interface ProcessingStatus {
  lastRun: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  videosProcessed: number;
  commentsHarvested: number;
  domainsExtracted: number;
}

// Time series data point
export interface TimeSeriesDataPoint {
  date: string;
  domains: number;
  mentions: number;
}

// Complete dashboard statistics
export interface DashboardStats {
  totalDomains: number;
  newToday: number;
  totalMentions: number;
  activeVideos: number;
  trending: TrendingDomain[];
  processingStatus: ProcessingStatus;
  timeSeriesData: TimeSeriesDataPoint[];
}

// ============================================================================
// JOB AND WORKER TYPES
// ============================================================================

// Base job log type from database
export type JobLog = Database["public"]["Tables"]["job_log"]["Row"];

// Worker webhook payload
export interface WorkerWebhookPayload {
  jobId: string;
  jobType: "discovery" | "comment_harvesting" | "domain_extraction";
  status: "started" | "completed" | "failed";
  metadata?: Record<string, unknown>;
  error?: string;
  results?: {
    videosProcessed?: number;
    commentsHarvested?: number;
    domainsExtracted?: number;
  };
}

// Job processing status
export interface JobStatus extends JobLog {
  duration_ms?: number;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

// API Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Validation error format
export interface ValidationErrors {
  [field: string]: string[];
}

// Error response format
export interface ErrorApiResponse extends ApiResponse {
  success: false;
  error: string;
  errors?: ValidationErrors;
}

// ============================================================================
// RATE LIMITING TYPES
// ============================================================================

// Rate limit information
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

// ============================================================================
// API CLIENT TYPES
// ============================================================================

// API client configuration
export interface ApiClientConfig {
  baseUrl: string;
  authToken?: string;
  timeout?: number;
  retries?: number;
}

// API client response wrapper
export interface ApiClientResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  rateLimit?: RateLimitInfo;
}

// ============================================================================
// LEGACY TYPES (for backward compatibility)
// ============================================================================

// Legacy domain with stats (kept for compatibility)
export interface DomainWithStats extends Domain {
  comment_count: number;
  video_count: number;
  author_count: number;
}

// Legacy comment with video (kept for compatibility)
export interface CommentWithVideo extends Comment {
  video: Video;
}

// Legacy video with stats (kept for compatibility)
export interface VideoWithStats extends Video {
  domain_mention_count: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

// Type guard for successful API responses
export function isApiSuccess<T>(
  response: ApiResponse<T>
): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

// Type guard for error API responses
export function isApiError(
  response: ApiResponse
): response is ErrorApiResponse {
  return response.success === false;
}

// Type guard for paginated responses
export function isPaginatedResponse<T>(
  response: ApiResponse
): response is PaginatedApiResponse<T> {
  return (
    response.success === true &&
    "pagination" in response &&
    typeof (response as any).pagination.page === "number"
  );
}

// Type guard for cursor paginated responses
export function isCursorPaginatedResponse<T>(
  response: ApiResponse
): response is CursorPaginatedApiResponse<T> {
  return (
    response.success === true &&
    "pagination" in response &&
    "cursor" in (response as any).pagination
  );
}
