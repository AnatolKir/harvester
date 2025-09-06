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

// Export response utilities
export {
  createSuccessResponse,
  createPaginatedResponse,
  createCursorPaginatedResponse,
  createErrorResponse,
  createValidationErrorResponse,
  withErrorHandling,
  addRateLimitHeaders,
  addCorsHeaders,
} from "./responses";

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
