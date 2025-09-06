// Export API client
export { default as HarvesterApiClient, api, ApiError } from "./client";

// Export utility functions
export {
  createApiResponse,
  createApiError,
  parsePaginationParams,
  calculatePaginationMeta,
  validateDateFilter,
  getDateThreshold,
  isValidUUID,
  sanitizeSearchQuery,
  ErrorMessages,
  StatusCodes,
} from "./utils";

// Re-export API types
export type {
  ApiResponse,
  PaginationParams,
  DomainFilters,
  DomainWithStats,
  CommentWithVideo,
  VideoWithStats,
  DashboardStats,
  JobStatus,
  ApiError as ApiErrorType,
} from "@/types/api";
