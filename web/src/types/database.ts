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
          video_id: string;
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
          video_id: string;
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
          video_id?: string;
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
          comment_id: string;
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
          comment_id: string;
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
          comment_id?: string;
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
          tld: string;
          subdomain: string | null;
          is_suspicious: boolean;
          is_verified: boolean;
          mention_count: number;
          first_seen_at: string;
          last_seen_at: string;
          notes: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          domain: string;
          tld: string;
          subdomain?: string | null;
          is_suspicious?: boolean;
          is_verified?: boolean;
          mention_count?: number;
          first_seen_at?: string;
          last_seen_at?: string;
          notes?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          domain?: string;
          tld?: string;
          subdomain?: string | null;
          is_suspicious?: boolean;
          is_verified?: boolean;
          mention_count?: number;
          first_seen_at?: string;
          last_seen_at?: string;
          notes?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      domain_mention: {
        Row: {
          id: string;
          domain_id: string;
          domain: string | null;
          comment_id: string;
          video_id: string;
          mention_text: string;
          position_start: number | null;
          position_end: number | null;
          context: string | null;
          confidence_score: number;
          extraction_method: string;
          discovered_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          domain_id: string;
          domain?: string | null;
          comment_id: string;
          video_id: string;
          mention_text: string;
          position_start?: number | null;
          position_end?: number | null;
          context?: string | null;
          confidence_score?: number;
          extraction_method?: string;
          discovered_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          domain_id?: string;
          domain?: string | null;
          comment_id?: string;
          video_id?: string;
          mention_text?: string;
          position_start?: number | null;
          position_end?: number | null;
          context?: string | null;
          confidence_score?: number;
          extraction_method?: string;
          discovered_at?: string;
          created_at?: string;
          updated_at?: string;
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
      user_profiles: {
        Row: {
          id: string;
          email: string;
          status: "pending" | "approved" | "rejected";
          role: "admin" | "user";
          approved_by: string | null;
          approved_at: string | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          status?: "pending" | "approved" | "rejected";
          role?: "admin" | "user";
          approved_by?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          status?: "pending" | "approved" | "rejected";
          role?: "admin" | "user";
          approved_by?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      v_domains_overview: {
        Row: {
          id: string;
          domain: string;
          total_mentions: number;
          first_seen: string;
          last_seen: string;
          is_suspicious: boolean;
          is_verified: boolean;
          metadata: Json | null;
        };
      };
      v_domains_new_today: {
        Row: {
          id: string;
          domain: string;
          mentions_today: number;
          first_seen: string;
        };
      };
      v_domain_mentions_recent: {
        Row: {
          id: string;
          domain: string;
          domain_id: string;
          comment_id: string;
          video_id: string;
          created_at: string;
          discovered_at: string;
          mention_text: string;
          context: string | null;
        };
      };
      v_pipeline_stats: {
        Row: {
          domains_day: number;
          comments_day: number;
          errors_day: number;
        };
      };
      v_user_management: {
        Row: {
          id: string | null;
          email: string | null;
          status: string | null;
          role: string | null;
          approved_by: string | null;
          approved_at: string | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
          approved_by_email: string | null;
          status_display: string | null;
        };
      };
    };
    Functions: {
      approve_user: {
        Args: {
          target_user_id: string;
        };
        Returns: undefined;
      };
      reject_user: {
        Args: {
          target_user_id: string;
          reason?: string;
        };
        Returns: undefined;
      };
      is_user_approved: {
        Args: {};
        Returns: boolean;
      };
      is_user_admin: {
        Args: {};
        Returns: boolean;
      };
      get_domain_time_series: {
        Args: {
          p_domain_id: string;
          p_start_date: string;
          p_end_date: string;
        };
        Returns: Array<{
          date: string;
          mention_count: number;
        }>;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
