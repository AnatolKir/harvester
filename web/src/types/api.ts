import type { Database } from "./database";

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

// Pagination parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Filter parameters for domains
export interface DomainFilters {
  search?: string;
  dateFilter?: "today" | "week" | "month" | "all";
  page?: number;
  limit?: number;
}

// Domain with statistics
export interface DomainWithStats {
  id: string;
  domain: string;
  first_seen_at: string;
  last_seen_at: string;
  mention_count: number;
  unique_video_count: number;
  unique_author_count: number;
  is_suspicious: boolean;
  is_active: boolean;
  metadata: any | null;
  created_at: string;
  updated_at: string;
  comment_count: number;
  video_count: number;
  author_count: number;
}

// Comment with video information
export interface CommentWithVideo {
  id: string;
  video_id: string;
  tiktok_comment_id: string;
  author_username: string;
  author_display_name: string | null;
  content: string;
  like_count: number;
  reply_count: number;
  is_author_reply: boolean;
  created_at: string;
  posted_at: string | null;
  metadata: any | null;
  video: {
    id: string;
    tiktok_id: string;
    url: string;
    title: string | null;
    description: string | null;
    view_count: number;
    share_count: number;
    comment_count: number;
    is_promoted: boolean;
    created_at: string;
    updated_at: string;
    last_scraped_at: string | null;
    scrape_status: "pending" | "processing" | "completed" | "failed";
    error_message: string | null;
    metadata: any | null;
  };
}

// Video with statistics
export interface VideoWithStats {
  id: string;
  tiktok_id: string;
  url: string;
  title: string | null;
  description: string | null;
  view_count: number;
  share_count: number;
  comment_count: number;
  is_promoted: boolean;
  created_at: string;
  updated_at: string;
  last_scraped_at: string | null;
  scrape_status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  metadata: any | null;
  domain_mention_count: number;
}

// Dashboard statistics
export interface DashboardStats {
  total_domains: number;
  new_domains_today: number;
  new_domains_week: number;
  trending_domains: number;
  total_videos: number;
  total_comments: number;
  total_mentions: number;
  active_jobs: number;
  failed_jobs: number;
}

// Job processing status
export interface JobStatus {
  id: string;
  job_type: string;
  status: "pending" | "processing" | "completed" | "failed";
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  metadata: any | null;
  created_at: string;
  duration_ms?: number;
}

// API Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}
