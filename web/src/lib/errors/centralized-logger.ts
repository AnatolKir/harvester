/**
 * Centralized error logging and monitoring system
 *
 * Provides structured error logging with context, correlation IDs,
 * and integration with monitoring services.
 */

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  correlationId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: string;
  environment: string;
  component: "web" | "worker" | "inngest" | "mcp-gateway";
  severity: "low" | "medium" | "high" | "critical";
  tags?: Record<string, string>;
}

export interface ErrorDetails {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  statusCode?: number;
  cause?: any;
}

export interface LogEvent {
  error: ErrorDetails;
  context: ErrorContext;
  level: "error" | "warn" | "info";
  timestamp: string;
  fingerprint?: string; // For error grouping/deduplication
}

class CentralizedLogger {
  private isDevelopment: boolean;
  private enableSentry: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
    this.enableSentry = process.env.ENABLE_SENTRY === "true";
  }

  /**
   * Log an error with full context
   */
  logError(error: Error, context: Partial<ErrorContext> = {}): void {
    const errorDetails: ErrorDetails = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
      statusCode: (error as any).statusCode,
      cause: (error as any).cause,
    };

    const fullContext: ErrorContext = {
      ...context,
      timestamp: context.timestamp || new Date().toISOString(),
      environment: process.env.NODE_ENV || "unknown",
      component: context.component || "web",
      severity: context.severity || this.getSeverityFromError(error),
    };

    const logEvent: LogEvent = {
      error: errorDetails,
      context: fullContext,
      level: "error",
      timestamp: fullContext.timestamp,
      fingerprint: this.generateFingerprint(error, fullContext),
    };

    // Console logging (always enabled)
    this.logToConsole(logEvent);

    // Database logging (for persistent storage)
    this.logToDatabase(logEvent).catch((dbError) => {
      console.error("Failed to log to database:", dbError);
    });

    // External monitoring (Sentry, etc.)
    if (this.enableSentry) {
      this.logToSentry(logEvent);
    }

    // Real-time alerts for critical errors
    if (fullContext.severity === "critical") {
      this.sendAlert(logEvent).catch((alertError) => {
        console.error("Failed to send alert:", alertError);
      });
    }
  }

  /**
   * Log a warning with context
   */
  logWarning(message: string, context: Partial<ErrorContext> = {}): void {
    const logEvent: LogEvent = {
      error: { name: "Warning", message },
      context: {
        ...context,
        timestamp: context.timestamp || new Date().toISOString(),
        environment: process.env.NODE_ENV || "unknown",
        component: context.component || "web",
        severity: context.severity || "medium",
      } as ErrorContext,
      level: "warn",
      timestamp: new Date().toISOString(),
    };

    this.logToConsole(logEvent);
    this.logToDatabase(logEvent).catch(() => {}); // Silent fail for warnings
  }

  /**
   * Determine error severity from error type/message
   */
  private getSeverityFromError(error: Error): ErrorContext["severity"] {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Critical errors
    if (
      name.includes("database") ||
      name.includes("connection") ||
      message.includes("fatal") ||
      message.includes("critical") ||
      (error as any).statusCode >= 500
    ) {
      return "critical";
    }

    // High severity errors
    if (
      name.includes("validation") ||
      name.includes("auth") ||
      message.includes("unauthorized") ||
      (error as any).statusCode >= 400
    ) {
      return "high";
    }

    // Medium severity (default for most errors)
    return "medium";
  }

  /**
   * Generate fingerprint for error grouping/deduplication
   */
  private generateFingerprint(error: Error, context: ErrorContext): string {
    const components = [
      error.name,
      error.message.split(" ").slice(0, 5).join(" "), // First 5 words
      context.endpoint,
      context.component,
    ].filter(Boolean);

    return btoa(components.join("|")).substring(0, 16);
  }

  /**
   * Log to console with structured format
   */
  private logToConsole(logEvent: LogEvent): void {
    if (this.isDevelopment) {
      // Pretty format for development
      console.error("🚨 ERROR LOGGED:", {
        error: logEvent.error.message,
        severity: logEvent.context.severity,
        component: logEvent.context.component,
        endpoint: logEvent.context.endpoint,
        stack: logEvent.error.stack,
      });
    } else {
      // JSON format for production
      console.error(JSON.stringify(logEvent));
    }
  }

  /**
   * Log to database for persistence
   */
  private async logToDatabase(logEvent: LogEvent): Promise<void> {
    try {
      // This would integrate with your Supabase client
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();

      await supabase.from("system_logs").insert({
        event_type: "error",
        level: logEvent.level,
        message: logEvent.error.message,
        metadata: {
          error: logEvent.error,
          context: logEvent.context,
          fingerprint: logEvent.fingerprint,
        },
        created_at: logEvent.timestamp,
      });
    } catch (error) {
      // Silent fail - don't throw errors from logging
      console.error("Database logging failed:", error);
    }
  }

  /**
   * Log to Sentry (when enabled)
   */
  private logToSentry(logEvent: LogEvent): void {
    try {
      // This would integrate with Sentry SDK
      // import * as Sentry from '@sentry/nextjs';
      //
      // Sentry.withScope(scope => {
      //   scope.setContext('error_context', logEvent.context);
      //   scope.setFingerprint([logEvent.fingerprint]);
      //   scope.setLevel(logEvent.level);
      //
      //   const error = new Error(logEvent.error.message);
      //   error.name = logEvent.error.name;
      //   if (logEvent.error.stack) error.stack = logEvent.error.stack;
      //
      //   Sentry.captureException(error);
      // });
    } catch (error) {
      console.error("Sentry logging failed:", error);
    }
  }

  /**
   * Send real-time alerts for critical errors
   */
  private async sendAlert(logEvent: LogEvent): Promise<void> {
    try {
      // Use existing alert system from the codebase
      const { alertJobError } = await import("@/lib/alerts");

      await alertJobError(`critical-error-${Date.now()}`, {
        error: logEvent.error.message,
        context: logEvent.context,
        severity: "critical",
        fingerprint: logEvent.fingerprint,
      });
    } catch (error) {
      console.error("Alert sending failed:", error);
    }
  }

  /**
   * Create a request-scoped logger with common context
   */
  createRequestLogger(baseContext: Partial<ErrorContext>) {
    return {
      error: (error: Error, context: Partial<ErrorContext> = {}) => {
        this.logError(error, { ...baseContext, ...context });
      },
      warn: (message: string, context: Partial<ErrorContext> = {}) => {
        this.logWarning(message, { ...baseContext, ...context });
      },
    };
  }
}

// Global instance
export const logger = new CentralizedLogger();

/**
 * Higher-order function to wrap API handlers with automatic error logging
 */
export function withErrorLogging<T extends unknown[]>(
  handler: (...args: T) => Promise<any>,
  context: Partial<ErrorContext> = {}
) {
  return async (...args: T) => {
    const requestLogger = logger.createRequestLogger(context);

    try {
      return await handler(...args);
    } catch (error) {
      requestLogger.error(
        error instanceof Error ? error : new Error(String(error)),
        {
          ...context,
          tags: {
            ...context.tags,
            handler: handler.name || "anonymous",
          },
        }
      );
      throw error; // Re-throw to maintain normal error handling
    }
  };
}

/**
 * Error metrics collection
 */
export class ErrorMetrics {
  private static instance: ErrorMetrics;
  private errorCounts: Map<string, number> = new Map();
  private lastReset: number = Date.now();

  static getInstance(): ErrorMetrics {
    if (!ErrorMetrics.instance) {
      ErrorMetrics.instance = new ErrorMetrics();
    }
    return ErrorMetrics.instance;
  }

  recordError(fingerprint: string): void {
    const current = this.errorCounts.get(fingerprint) || 0;
    this.errorCounts.set(fingerprint, current + 1);
  }

  getMetrics() {
    const now = Date.now();
    const timeWindow = now - this.lastReset;

    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce(
        (a, b) => a + b,
        0
      ),
      uniqueErrors: this.errorCounts.size,
      timeWindowMs: timeWindow,
      errorRate: this.calculateErrorRate(timeWindow),
      topErrors: this.getTopErrors(5),
    };
  }

  private calculateErrorRate(timeWindow: number): number {
    const totalErrors = Array.from(this.errorCounts.values()).reduce(
      (a, b) => a + b,
      0
    );
    const hoursWindow = timeWindow / (1000 * 60 * 60);
    return hoursWindow > 0 ? totalErrors / hoursWindow : 0;
  }

  private getTopErrors(limit: number) {
    return Array.from(this.errorCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([fingerprint, count]) => ({ fingerprint, count }));
  }

  reset(): void {
    this.errorCounts.clear();
    this.lastReset = Date.now();
  }
}

export default logger;
