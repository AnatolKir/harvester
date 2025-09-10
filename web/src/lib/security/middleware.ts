/**
 * Security middleware for API endpoints
 *
 * Provides comprehensive security checks including input validation,
 * rate limiting, authentication, and threat detection.
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";

import { rateLimitMiddleware } from "../rate-limit/middleware";

import { SecurityUtils } from "./index";

export interface SecurityMiddlewareOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  rateLimitConfig?: {
    authenticated?: boolean;
    identifier?: string;
  };
  validatePayload?: boolean;
  maxPayloadSize?: number; // in bytes
  allowedMethods?: string[];
  corsEnabled?: boolean;
  allowedOrigins?: string[];
  requireCsrf?: boolean;
}

export interface SecurityContext {
  requestId: string;
  clientId: string;
  isAuthenticated: boolean;
  isSuspicious: boolean;
  isAdmin?: boolean;
  timestamp: number;
}

/**
 * Comprehensive security middleware that wraps API handlers
 */
export function withSecurity<T extends unknown[]>(
  handler: (
    request: NextRequest,
    context: SecurityContext,
    ...args: T
  ) => Promise<NextResponse>,
  options: SecurityMiddlewareOptions = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = Date.now();
    const incomingCorrelation =
      request.headers.get("x-correlation-id") ||
      request.headers.get("x-request-id");
    const requestId =
      incomingCorrelation || SecurityUtils.Auth.generateRequestId();
    const clientId = SecurityUtils.RateLimit.getClientIdentifier(request);

    try {
      // Create security context
      const context: SecurityContext = {
        requestId,
        clientId,
        isAuthenticated: false,
        isSuspicious: SecurityUtils.RateLimit.isSuspiciousRequest(request),
        timestamp: startTime,
      };

      // 1. Method validation
      if (
        options.allowedMethods &&
        !options.allowedMethods.includes(request.method)
      ) {
        return createSecurityErrorResponse("Method not allowed", 405, {
          requestId,
          method: request.method,
        });
      }

      // 2. Suspicious request detection
      if (context.isSuspicious) {
        console.warn(`Suspicious request detected: ${requestId}`, {
          clientId,
          userAgent: request.headers.get("user-agent"),
          url: request.url,
        });

        // Could implement more aggressive blocking here
        // For now, just log and continue with stricter rate limiting
      }

      // 3. Rate limiting
      let rateLimitHeaders: Record<string, string> | undefined;
      if (options.rateLimitConfig !== undefined) {
        const rl = await rateLimitMiddleware(request, {
          ...options.rateLimitConfig,
          identifier: clientId,
        });

        if ("error" in (rl as Record<string, unknown>)) {
          return rl as unknown as NextResponse;
        }
        const rawHeaders = (
          rl as unknown as { headers: Record<string, unknown> }
        ).headers;
        rateLimitHeaders = Object.fromEntries(
          Object.entries(rawHeaders).map(([k, v]) => [k, String(v)])
        );
      }

      // 4. Origin / CORS checks for non-GET
      if (request.method !== "GET") {
        const origin =
          request.headers.get("origin") || request.headers.get("referer") || "";
        const allowed = options.allowedOrigins || [
          process.env.NEXT_PUBLIC_BASE_URL || "",
        ];
        if (allowed.filter(Boolean).length > 0) {
          const ok = allowed.some((o) => origin.startsWith(o));
          if (!ok) {
            return createSecurityErrorResponse("Origin not allowed", 403, {
              requestId,
            });
          }
        }
      }

      // 5. Payload validation
      if (
        options.validatePayload &&
        (request.method === "POST" ||
          request.method === "PUT" ||
          request.method === "PATCH")
      ) {
        const contentLength = request.headers.get("content-length");
        const maxSize = options.maxPayloadSize || 1024 * 1024; // 1MB default

        if (contentLength && parseInt(contentLength) > maxSize) {
          return createSecurityErrorResponse("Payload too large", 413, {
            requestId,
            size: contentLength,
            maxSize,
          });
        }

        // Validate JSON structure if content-type is JSON
        const contentType = request.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          try {
            const payload = await request.json();

            if (!SecurityUtils.Data.validateJsonPayload(payload)) {
              return createSecurityErrorResponse(
                "Invalid payload structure",
                400,
                { requestId }
              );
            }

            // Re-create request with validated payload
            request = new NextRequest(request.url, {
              ...request,
              body: JSON.stringify(payload),
            });
          } catch {
            return createSecurityErrorResponse("Invalid JSON payload", 400, {
              requestId,
            });
          }
        }
      }

      // 6. Authentication check (if required)
      if (options.requireAuth) {
        // E2E bypass for CI/testing
        if (process.env.E2E_BYPASS_AUTH === "true") {
          context.isAuthenticated = true;
          // In admin mode, also satisfy admin requirement
          if ((options as SecurityMiddlewareOptions).requireAdmin) {
            context.isAdmin = true;
          }
        } else {
          // Validate via Supabase cookies
          try {
            const { createServerClient } = await import("@supabase/ssr");
            const supabase = createServerClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              {
                cookies: {
                  getAll() {
                    return request.cookies.getAll();
                  },
                  setAll() {},
                },
              }
            );
            const { data } = await supabase.auth.getUser();
            const user = data.user;
            if (!user) {
              return createSecurityErrorResponse(
                "Authentication required",
                401,
                {
                  requestId,
                }
              );
            }
            context.isAuthenticated = true;

            if (options.requireAdmin) {
              const adminEmails = (process.env.ADMIN_EMAILS || "")
                .split(",")
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean);
              const isAdmin =
                (user.user_metadata &&
                  (user.user_metadata.role === "admin" ||
                    user.user_metadata.is_admin === true)) ||
                (user.email
                  ? adminEmails.includes(user.email.toLowerCase())
                  : false);
              if (!isAdmin) {
                return createSecurityErrorResponse("Forbidden", 403, {
                  requestId,
                });
              }
            }
          } catch {
            return createSecurityErrorResponse("Auth error", 401, {
              requestId,
            });
          }
        }
      }

      // 7. Call the actual handler
      const response = await handler(request, context, ...args);

      // 8. Add security headers
      SecurityUtils.Headers.addSecurityHeaders(response);

      // 9. Add request ID for tracking
      response.headers.set("X-Request-ID", requestId);
      // Also expose a correlation header alias for compatibility
      response.headers.set("X-Correlation-ID", requestId);

      // 10. Add rate limit headers if available
      if (rateLimitHeaders) {
        for (const [key, value] of Object.entries(rateLimitHeaders)) {
          response.headers.set(key, value);
        }
      }

      // 11. Log successful request
      const duration = Date.now() - startTime;
      console.log(`API Request: ${request.method} ${request.url}`, {
        requestId,
        clientId,
        duration,
        status: response.status,
        suspicious: context.isSuspicious,
      });

      return response;
    } catch (error) {
      console.error(`Security middleware error: ${requestId}`, error);

      const errorMessage =
        error instanceof Error
          ? SecurityUtils.Input.sanitizeErrorMessage(error.message)
          : "Internal server error";

      return createSecurityErrorResponse(errorMessage, 500, { requestId });
    }
  };
}

/**
 * Validation middleware that combines Zod schema validation with security checks
 */
export function withValidation<T, TRequest extends NextRequest>(
  schema: ZodSchema<T>,
  handler: (
    request: TRequest,
    validatedData: T,
    context: SecurityContext
  ) => Promise<NextResponse>,
  options: SecurityMiddlewareOptions = {}
) {
  return withSecurity(
    async (request: NextRequest, context: SecurityContext) => {
      try {
        // Parse request data based on method
        let data: unknown;

        if (request.method === "GET") {
          // Parse query parameters
          const searchParams = request.nextUrl.searchParams;
          const queryObj: Record<string, unknown> = {};
          for (const [key, value] of searchParams.entries()) {
            // Apply input validation to search parameters
            if (key === "search") {
              queryObj[key] = SecurityUtils.Input.validateSearchQuery(value);
            } else {
              queryObj[key] = value;
            }
          }
          data = queryObj;
        } else {
          // Parse JSON body for POST/PUT/PATCH
          data = await request.json();

          // Apply security validation to string fields
          if (typeof data === "object" && data !== null) {
            data = sanitizeObjectStrings(data);
          }
        }

        // Validate against schema
        const validatedData = schema.parse(data);

        return await handler(request as TRequest, validatedData, context);
      } catch (error) {
        if (error instanceof ZodError) {
          return createValidationErrorResponse(error, context.requestId);
        }

        throw error; // Re-throw non-validation errors
      }
    },
    options
  );
}

/**
 * Webhook-specific security middleware
 */
export function withWebhookSecurity<TRequest extends NextRequest>(
  handler: (
    request: TRequest,
    context: SecurityContext
  ) => Promise<NextResponse>
) {
  return withSecurity(handler, {
    requireAuth: true,
    rateLimitConfig: { authenticated: false }, // Use stricter rate limiting for webhooks
    validatePayload: true,
    maxPayloadSize: 512 * 1024, // 512KB max for webhooks
    allowedMethods: ["POST"],
    corsEnabled: true,
  });
}

/**
 * Create a standardized security error response
 */
function createSecurityErrorResponse(
  message: string,
  status: number,
  metadata?: Record<string, unknown>
): NextResponse {
  const response = NextResponse.json(
    {
      success: false,
      error: message,
      ...(process.env.NODE_ENV === "development" &&
        metadata && { debug: metadata }),
    },
    { status }
  );

  // Add security headers
  SecurityUtils.Headers.addSecurityHeaders(response);

  if (metadata?.requestId) {
    response.headers.set("X-Request-ID", metadata.requestId);
    response.headers.set("X-Correlation-ID", metadata.requestId);
  }

  return response;
}

/**
 * Create validation error response with security considerations
 */
function createValidationErrorResponse(
  error: ZodError,
  requestId: string
): NextResponse {
  // Sanitize error messages to prevent information leakage
  const errors = error.issues.reduce(
    (acc, err) => {
      const path = err.path.join(".");
      if (!acc[path]) {
        acc[path] = [];
      }

      // Sanitize error message
      const sanitizedMessage = SecurityUtils.Input.sanitizeErrorMessage(
        err.message
      );
      acc[path].push(sanitizedMessage);

      return acc;
    },
    {} as Record<string, string[]>
  );

  const response = NextResponse.json(
    {
      success: false,
      error: "Validation failed",
      errors,
    },
    { status: 400 }
  );

  SecurityUtils.Headers.addSecurityHeaders(response);
  response.headers.set("X-Request-ID", requestId);

  return response;
}

/**
 * Recursively sanitize string values in an object
 */
function sanitizeObjectStrings(obj: unknown): unknown {
  if (typeof obj === "string") {
    return SecurityUtils.Input.validateSearchQuery(obj) || "";
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectStrings);
  }

  if (typeof obj === "object" && obj !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      sanitized[key] = sanitizeObjectStrings(value);
    }
    return sanitized;
  }

  return obj;
}

// Export commonly used configurations
export const PublicApiSecurity: SecurityMiddlewareOptions = {
  requireAuth: false,
  rateLimitConfig: { authenticated: false },
  validatePayload: false,
  corsEnabled: false,
};

export const AuthenticatedApiSecurity: SecurityMiddlewareOptions = {
  requireAuth: true,
  rateLimitConfig: { authenticated: true },
  validatePayload: true,
  corsEnabled: false,
};

export const WebhookSecurity: SecurityMiddlewareOptions = {
  requireAuth: true,
  rateLimitConfig: { authenticated: false },
  validatePayload: true,
  maxPayloadSize: 512 * 1024,
  allowedMethods: ["POST", "OPTIONS"],
  corsEnabled: true,
};
