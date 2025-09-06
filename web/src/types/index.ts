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

// Authentication Types
export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at?: string | null;
  phone?: string | null;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string | null;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: AuthUser;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  options?: {
    data?: Record<string, unknown>;
    emailRedirectTo?: string;
    captchaToken?: string;
  };
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthError {
  message: string;
  status?: number;
  code?: string;
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  error: AuthError | null;
}

export interface ResetPasswordCredentials {
  email: string;
  options?: {
    redirectTo?: string;
    captchaToken?: string;
  };
}

export interface UpdatePasswordCredentials {
  password: string;
}

export interface AuthContextType extends AuthState {
  signUp: (
    credentials: SignUpCredentials
  ) => Promise<{ error: AuthError | null }>;
  signIn: (
    credentials: SignInCredentials
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (
    credentials: ResetPasswordCredentials
  ) => Promise<{ error: AuthError | null }>;
  updatePassword: (
    credentials: UpdatePasswordCredentials
  ) => Promise<{ error: AuthError | null }>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

// Form Types
export interface SignInFormData {
  email: string;
  password: string;
}

export interface SignUpFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordFormData {
  email: string;
}

export interface UpdatePasswordFormData {
  password: string;
  confirmPassword: string;
}

// Route Protection Types
export interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export interface RouteGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
