export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      video: {
        Row: {
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
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          tiktok_id: string;
          url: string;
          title?: string | null;
          description?: string | null;
          view_count?: number;
          share_count?: number;
          comment_count?: number;
          is_promoted?: boolean;
          created_at?: string;
          updated_at?: string;
          last_scraped_at?: string | null;
          scrape_status?: "pending" | "processing" | "completed" | "failed";
          error_message?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          tiktok_id?: string;
          url?: string;
          title?: string | null;
          description?: string | null;
          view_count?: number;
          share_count?: number;
          comment_count?: number;
          is_promoted?: boolean;
          created_at?: string;
          updated_at?: string;
          last_scraped_at?: string | null;
          scrape_status?: "pending" | "processing" | "completed" | "failed";
          error_message?: string | null;
          metadata?: Json | null;
        };
      };
      comment: {
        Row: {
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
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          video_id: string;
          tiktok_comment_id: string;
          author_username: string;
          author_display_name?: string | null;
          content: string;
          like_count?: number;
          reply_count?: number;
          is_author_reply?: boolean;
          created_at?: string;
          posted_at?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          video_id?: string;
          tiktok_comment_id?: string;
          author_username?: string;
          author_display_name?: string | null;
          content?: string;
          like_count?: number;
          reply_count?: number;
          is_author_reply?: boolean;
          created_at?: string;
          posted_at?: string | null;
          metadata?: Json | null;
        };
      };
      domain: {
        Row: {
          id: string;
          domain: string;
          first_seen_at: string;
          last_seen_at: string;
          mention_count: number;
          unique_video_count: number;
          unique_author_count: number;
          is_suspicious: boolean;
          is_active: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          domain: string;
          first_seen_at?: string;
          last_seen_at?: string;
          mention_count?: number;
          unique_video_count?: number;
          unique_author_count?: number;
          is_suspicious?: boolean;
          is_active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          domain?: string;
          first_seen_at?: string;
          last_seen_at?: string;
          mention_count?: number;
          unique_video_count?: number;
          unique_author_count?: number;
          is_suspicious?: boolean;
          is_active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      domain_mention: {
        Row: {
          id: string;
          domain_id: string;
          source_type: "video" | "comment";
          source_id: string;
          position_start: number | null;
          position_end: number | null;
          context: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          domain_id: string;
          source_type: "video" | "comment";
          source_id: string;
          position_start?: number | null;
          position_end?: number | null;
          context?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          domain_id?: string;
          source_type?: "video" | "comment";
          source_id?: string;
          position_start?: number | null;
          position_end?: number | null;
          context?: string | null;
          created_at?: string;
        };
      };
      job_log: {
        Row: {
          id: string;
          job_type: string;
          status: "pending" | "processing" | "completed" | "failed";
          started_at: string;
          completed_at: string | null;
          error_message: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_type: string;
          status?: "pending" | "processing" | "completed" | "failed";
          started_at?: string;
          completed_at?: string | null;
          error_message?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_type?: string;
          status?: "pending" | "processing" | "completed" | "failed";
          started_at?: string;
          completed_at?: string | null;
          error_message?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
    };
    Views: {
      v_domains_new_today: {
        Row: {
          id: string | null;
          domain: string | null;
          first_seen_at: string | null;
          mention_count: number | null;
          unique_video_count: number | null;
          unique_author_count: number | null;
          is_suspicious: boolean | null;
        };
      };
      v_domains_trending: {
        Row: {
          id: string | null;
          domain: string | null;
          mention_count: number | null;
          recent_mentions: number | null;
          growth_rate: number | null;
          unique_video_count: number | null;
          unique_author_count: number | null;
        };
      };
      v_domain_details: {
        Row: {
          domain_id: string | null;
          domain: string | null;
          first_seen_at: string | null;
          last_seen_at: string | null;
          total_mentions: number | null;
          video_mentions: number | null;
          comment_mentions: number | null;
          unique_videos: number | null;
          unique_authors: number | null;
          is_suspicious: boolean | null;
        };
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
