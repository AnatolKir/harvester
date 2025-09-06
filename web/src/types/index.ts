export interface Domain {
  id: string;
  domain: string;
  first_seen: string;
  last_seen: string;
  total_mentions: number;
  created_at: string;
  updated_at: string;
}

export interface DomainMention {
  id: string;
  domain_id: string;
  video_id: string;
  comment_id: string;
  mention_text: string;
  created_at: string;
  domain?: Domain;
  video?: Video;
  comment?: Comment;
}

export interface Video {
  id: string;
  tiktok_video_id: string;
  title: string | null;
  description: string | null;
  author_username: string | null;
  video_url: string;
  discovery_method: string;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  video_id: string;
  tiktok_comment_id: string;
  author_username: string | null;
  comment_text: string;
  likes_count: number | null;
  reply_to_comment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_domains: number;
  domains_today: number;
  domains_this_week: number;
  total_videos: number;
  total_comments: number;
  total_mentions: number;
}

export interface TableColumn<T = Record<string, unknown>> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface TableProps<T = Record<string, unknown>> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  sorting?: {
    key: keyof T;
    direction: "asc" | "desc";
    onSort: (key: keyof T) => void;
  };
}
