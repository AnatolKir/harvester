import type {
  ApiResponse,
  DomainWithStats,
  DomainFilters,
  CommentWithVideo,
  VideoWithStats,
  DashboardStats,
  JobStatus,
  PaginationParams,
} from "@/types/api";

/**
 * Base API client configuration
 */
const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://your-domain.vercel.app"
    : "http://localhost:3000";

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Generic API request handler
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}/api${endpoint}`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data: ApiResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    throw new ApiError(
      response.status,
      `HTTP_${response.status}`,
      data.error || "Request failed",
      data
    );
  }

  return data;
}

/**
 * API client class with all endpoint methods
 */
export class HarvesterApiClient {
  /**
   * Get paginated list of domains with optional filtering
   */
  static async getDomains(
    filters: DomainFilters = {}
  ): Promise<ApiResponse<DomainWithStats[]>> {
    const params = new URLSearchParams();

    if (filters.search) params.append("search", filters.search);
    if (filters.dateFilter) params.append("dateFilter", filters.dateFilter);
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.limit) params.append("limit", filters.limit.toString());

    const queryString = params.toString();
    const endpoint = `/domains${queryString ? `?${queryString}` : ""}`;

    return apiRequest<DomainWithStats[]>(endpoint);
  }

  /**
   * Get single domain details by ID
   */
  static async getDomain(id: string): Promise<ApiResponse<DomainWithStats>> {
    return apiRequest<DomainWithStats>(`/domains/${id}`);
  }

  /**
   * Get comments for a specific domain
   */
  static async getDomainComments(
    id: string,
    pagination: PaginationParams = {}
  ): Promise<ApiResponse<CommentWithVideo[]>> {
    const params = new URLSearchParams();

    if (pagination.page) params.append("page", pagination.page.toString());
    if (pagination.limit) params.append("limit", pagination.limit.toString());

    const queryString = params.toString();
    const endpoint = `/domains/${id}/comments${queryString ? `?${queryString}` : ""}`;

    return apiRequest<CommentWithVideo[]>(endpoint);
  }

  /**
   * Get videos for a specific domain
   */
  static async getDomainVideos(
    id: string,
    pagination: PaginationParams = {}
  ): Promise<ApiResponse<VideoWithStats[]>> {
    const params = new URLSearchParams();

    if (pagination.page) params.append("page", pagination.page.toString());
    if (pagination.limit) params.append("limit", pagination.limit.toString());

    const queryString = params.toString();
    const endpoint = `/domains/${id}/videos${queryString ? `?${queryString}` : ""}`;

    return apiRequest<VideoWithStats[]>(endpoint);
  }

  /**
   * Get dashboard statistics
   */
  static async getStats(): Promise<ApiResponse<DashboardStats>> {
    return apiRequest<DashboardStats>("/stats");
  }

  /**
   * Get job processing status with optional filtering
   */
  static async getJobs(
    pagination: PaginationParams = {},
    filters: {
      status?: string;
      job_type?: string;
    } = {}
  ): Promise<ApiResponse<JobStatus[]>> {
    const params = new URLSearchParams();

    if (pagination.page) params.append("page", pagination.page.toString());
    if (pagination.limit) params.append("limit", pagination.limit.toString());
    if (filters.status) params.append("status", filters.status);
    if (filters.job_type) params.append("job_type", filters.job_type);

    const queryString = params.toString();
    const endpoint = `/jobs${queryString ? `?${queryString}` : ""}`;

    return apiRequest<JobStatus[]>(endpoint);
  }
}

// Export individual functions for convenience
export const api = {
  domains: {
    list: HarvesterApiClient.getDomains,
    get: HarvesterApiClient.getDomain,
    comments: HarvesterApiClient.getDomainComments,
    videos: HarvesterApiClient.getDomainVideos,
  },
  stats: {
    get: HarvesterApiClient.getStats,
  },
  jobs: {
    list: HarvesterApiClient.getJobs,
  },
};

export { ApiError };
export default HarvesterApiClient;
