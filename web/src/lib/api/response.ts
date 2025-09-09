// Shared API response helpers that enforce standardized shapes/headers
// Re-export existing response utilities to satisfy the project structure
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

export type { ApiResponse } from "./responses";
