import {
  withSecurity,
  AuthenticatedApiSecurity,
} from "@/lib/security/middleware";
import { getRateLimitMetrics } from "@/lib/rate-limit/monitoring";
import { createSuccessResponse, createErrorResponse } from "@/lib/api";

async function handleGet() {
  try {
    const metrics = await getRateLimitMetrics();
    return createSuccessResponse(metrics);
  } catch (error) {
    console.error("Failed to fetch rate-limit metrics", error);
    return createErrorResponse("Failed to fetch rate-limit metrics", 500);
  }
}

export const GET = withSecurity(handleGet, {
  ...AuthenticatedApiSecurity,
});
