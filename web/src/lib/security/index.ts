/**
 * Security utilities for the TikTok Domain Harvester API
 *
 * This module provides security-focused validation, sanitization, and
 * protection mechanisms for API endpoints.
 */

import { NextRequest } from "next/server";
import { createHash, timingSafeEqual } from "crypto";

/**
 * SQL Injection Protection Utilities
 */
export class SQLSecurityUtils {
  // Dangerous SQL keywords that should be blocked or escaped
  private static readonly SQL_INJECTION_PATTERNS = [
    /(['"])\s*(;|--|\/\*|\*\/)/gi, // Quote followed by SQL terminators
    /\b(DROP|DELETE|UPDATE|INSERT|CREATE|ALTER|EXEC|EXECUTE)\b/gi, // Dangerous SQL commands
    /\b(UNION|SELECT)\s+.*\s+FROM\b/gi, // Union-based injections
    /\b(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/gi, // Boolean-based injections
    /\b(WAITFOR|DELAY|SLEEP|BENCHMARK)\b/gi, // Time-based injections
    /\b(INFORMATION_SCHEMA|SYS\.|SYSOBJECTS)\b/gi, // Schema enumeration
  ];

  /**
   * Check if a string contains potential SQL injection patterns
   */
  static containsSQLInjection(input: string): boolean {
    return this.SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
  }

  /**
   * Sanitize input by removing dangerous SQL patterns
   */
  static sanitizeSQLInput(input: string): string {
    let sanitized = input;

    // Remove dangerous patterns
    this.SQL_INJECTION_PATTERNS.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, "");
    });

    // Remove or escape quotes
    sanitized = sanitized.replace(/['"]/g, "");

    // Remove SQL comments
    sanitized = sanitized.replace(/--.*$/gm, "");
    sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, "");

    return sanitized.trim();
  }
}

/**
 * XSS Protection Utilities
 */
export class XSSSecurityUtils {
  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:[^"']*/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi, // Event handlers
    /<img[^>]+src[^>]*onerror[^>]*>/gi,
    /<svg[^>]*onload[^>]*>/gi,
    /expression\s*\(/gi, // CSS expressions
  ];

  static containsXSS(input: string): boolean {
    return this.XSS_PATTERNS.some((pattern) => pattern.test(input));
  }

  static sanitizeXSS(input: string): string {
    let sanitized = input;

    // Remove dangerous patterns
    this.XSS_PATTERNS.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, "");
    });

    // Encode HTML entities
    sanitized = sanitized
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");

    return sanitized;
  }
}

/**
 * Input Validation and Sanitization
 */
export class InputValidator {
  /**
   * Validate and sanitize search query
   */
  static validateSearchQuery(query: string | null): string | null {
    if (!query) return null;

    // Check length
    if (query.length > 255) {
      query = query.substring(0, 255);
    }

    // Check for malicious patterns
    if (
      SQLSecurityUtils.containsSQLInjection(query) ||
      XSSSecurityUtils.containsXSS(query)
    ) {
      // Sanitize the input
      query = SQLSecurityUtils.sanitizeSQLInput(query);
      query = XSSSecurityUtils.sanitizeXSS(query);
    }

    // Additional sanitization
    query = query
      .replace(/[<>'";&\\]/g, "") // Remove dangerous characters
      .trim();

    return query.length > 0 ? query : null;
  }

  /**
   * Validate UUID format strictly
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate cursor format (base64 encoded timestamp)
   */
  static isValidCursor(cursor: string): boolean {
    try {
      const decoded = Buffer.from(cursor, "base64").toString();
      const date = new Date(decoded);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  }

  /**
   * Sanitize error message to prevent information leakage
   */
  static sanitizeErrorMessage(error: string): string {
    // Remove potential sensitive information
    const patterns = [
      /password[=:]\s*[^\s,;]+/gi,
      /token[=:]\s*[^\s,;]+/gi,
      /key[=:]\s*[^\s,;]+/gi,
      /secret[=:]\s*[^\s,;]+/gi,
      /host[=:]\s*[^\s,;]+/gi,
      /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, // IP addresses
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Email addresses
    ];

    let sanitized = error;
    patterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, "[REDACTED]");
    });

    return sanitized;
  }
}

/**
 * Authentication and Authorization Utilities
 */
export class AuthSecurityUtils {
  /**
   * Validate webhook authentication token using timing-safe comparison
   */
  static validateWebhookToken(
    providedToken: string,
    expectedToken: string
  ): boolean {
    if (!providedToken || !expectedToken) return false;

    // Use timing-safe comparison to prevent timing attacks
    const providedBuffer = Buffer.from(providedToken, "utf8");
    const expectedBuffer = Buffer.from(expectedToken, "utf8");

    if (providedBuffer.length !== expectedBuffer.length) return false;

    return timingSafeEqual(providedBuffer, expectedBuffer);
  }

  /**
   * Extract and validate Bearer token from Authorization header
   */
  static extractBearerToken(authHeader: string | null): string | null {
    if (!authHeader) return null;

    const match = authHeader.match(/^Bearer\s+(.+)$/);
    return match ? match[1] : null;
  }

  /**
   * Generate a secure request ID for tracking
   */
  static generateRequestId(): string {
    return createHash("sha256")
      .update(`${Date.now()}-${Math.random()}`)
      .digest("hex")
      .substring(0, 16);
  }
}

/**
 * Rate Limiting Security Utilities
 */
export class RateLimitSecurityUtils {
  /**
   * Get client identifier for rate limiting
   */
  static getClientIdentifier(request: NextRequest): string {
    // Priority order for client identification
    const identifiers = [
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip"),
      request.headers.get("cf-connecting-ip"), // Cloudflare
      request.headers.get("x-client-ip"),
      "anonymous",
    ];

    for (const id of identifiers) {
      if (id) {
        // Take first IP if there are multiple (proxy chain)
        return id.split(",")[0].trim();
      }
    }

    return "anonymous";
  }

  /**
   * Check if request is from a suspicious source
   */
  static isSuspiciousRequest(request: NextRequest): boolean {
    const userAgent = request.headers.get("user-agent") || "";
    const referer = request.headers.get("referer") || "";

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /bot/i, // Generic bot detection (might want to be more specific)
      /crawler/i,
      /scanner/i,
      /curl/i,
      /wget/i,
      /python/i, // Python requests library
      /sqlmap/i, // SQL injection tool
      /nmap/i, // Network scanner
    ];

    const isSuspiciousUA = suspiciousPatterns.some((pattern) =>
      pattern.test(userAgent)
    );
    const hasNoUA = userAgent.length === 0;

    return isSuspiciousUA || hasNoUA;
  }
}

/**
 * Data Validation Security Utilities
 */
export class DataSecurityUtils {
  /**
   * Validate that pagination parameters are within safe limits
   */
  static validatePagination(
    page: number,
    limit: number
  ): { page: number; limit: number } {
    return {
      page: Math.max(1, Math.min(10000, page)), // Reasonable upper limit for pagination
      limit: Math.max(1, Math.min(100, limit)), // Max 100 items per page
    };
  }

  /**
   * Validate that date filters are reasonable
   */
  static validateDateRange(startDate?: Date, endDate?: Date): boolean {
    if (!startDate && !endDate) return true;

    const now = new Date();
    const maxPastDate = new Date();
    maxPastDate.setFullYear(now.getFullYear() - 2); // Max 2 years ago

    if (startDate && startDate < maxPastDate) return false;
    if (endDate && endDate > now) return false;
    if (startDate && endDate && startDate > endDate) return false;

    return true;
  }

  /**
   * Validate JSON payload size and structure
   */
  static validateJsonPayload(payload: any): boolean {
    try {
      const jsonString = JSON.stringify(payload);

      // Check size (max 1MB)
      if (jsonString.length > 1024 * 1024) return false;

      // Check nesting depth (max 10 levels)
      const maxDepth = 10;
      const depth = this.getObjectDepth(payload);
      if (depth > maxDepth) return false;

      return true;
    } catch {
      return false;
    }
  }

  private static getObjectDepth(obj: any, depth = 0): number {
    if (depth > 50) return depth; // Prevent stack overflow
    if (typeof obj !== "object" || obj === null) return depth;

    const depths = Object.values(obj).map((value) =>
      this.getObjectDepth(value, depth + 1)
    );

    return depths.length > 0 ? Math.max(...depths) : depth;
  }
}

/**
 * Security Headers Utility
 */
export class SecurityHeaders {
  static readonly SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
  };

  static addSecurityHeaders(response: Response): Response {
    Object.entries(this.SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }
}

// Export all utilities as a combined object for easy importing
export const SecurityUtils = {
  SQL: SQLSecurityUtils,
  XSS: XSSSecurityUtils,
  Input: InputValidator,
  Auth: AuthSecurityUtils,
  RateLimit: RateLimitSecurityUtils,
  Data: DataSecurityUtils,
  Headers: SecurityHeaders,
} as const;
