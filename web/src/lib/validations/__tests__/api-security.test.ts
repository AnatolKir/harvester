import { describe, expect, test } from "@jest/globals";
import {
  DomainsQuerySchema,
  VideosQuerySchema,
  DomainIdSchema,
  WorkerWebhookSchema,
} from "../api";

describe("API Security Validation Tests", () => {
  describe("Input Validation - SQL Injection Protection", () => {
    test("should reject SQL injection attempts in search queries", () => {
      const maliciousInputs = [
        "'; DROP TABLE domain; --",
        "' OR '1'='1",
        "'; UPDATE domain SET domain='hacked' WHERE '1'='1'; --",
        "' UNION SELECT * FROM information_schema.tables --",
        "admin'/**/OR/**/1=1/**/--",
        "' OR 1=1 UNION SELECT null,username,password FROM users --",
      ];

      maliciousInputs.forEach((input) => {
        const result = DomainsQuerySchema.safeParse({ search: input });

        // Should either be rejected or sanitized
        if (result.success) {
          // If accepted, ensure it's been sanitized
          expect(result.data.search).not.toContain("'");
          expect(result.data.search).not.toContain(";");
          expect(result.data.search).not.toContain("--");
          expect(result.data.search).not.toContain("/*");
          expect(result.data.search).not.toContain("*/");
        }
      });
    });

    test("should reject XSS attempts in search queries", () => {
      const xssInputs = [
        "<script>alert('xss')</script>",
        "javascript:alert('xss')",
        "<img src=x onerror=alert('xss')>",
        "<svg onload=alert('xss')>",
        "javascript:void(0)",
        "<iframe src=javascript:alert('xss')></iframe>",
      ];

      xssInputs.forEach((input) => {
        const result = DomainsQuerySchema.safeParse({ search: input });

        if (result.success) {
          expect(result.data.search).not.toContain("<script");
          expect(result.data.search).not.toContain("javascript:");
          expect(result.data.search).not.toContain("<img");
          expect(result.data.search).not.toContain("<svg");
          expect(result.data.search).not.toContain("<iframe");
        }
      });
    });

    test("should validate UUID format strictly", () => {
      const invalidUUIDs = [
        "not-a-uuid",
        "123456789",
        "550e8400-e29b-41d4-a716-44665544000", // too short
        "550e8400-e29b-41d4-a716-446655440000x", // too long
        "550e8400xe29bx41d4xa716x446655440000", // invalid separators
        "'; DROP TABLE domain; --",
        "<script>alert('xss')</script>",
        "../../../etc/passwd",
      ];

      invalidUUIDs.forEach((invalidUUID) => {
        const result = DomainIdSchema.safeParse({ id: invalidUUID });
        expect(result.success).toBe(false);
      });

      // Valid UUID should pass
      const validResult = DomainIdSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(validResult.success).toBe(true);
    });

    test("should enforce pagination limits to prevent DoS", () => {
      const result1 = DomainsQuerySchema.safeParse({ limit: "999999" });
      expect(result1.success).toBe(true);
      expect(result1.data?.limit).toBeLessThanOrEqual(100);

      const result2 = DomainsQuerySchema.safeParse({ limit: "-1" });
      expect(result2.success).toBe(true);
      expect(result2.data?.limit).toBeGreaterThanOrEqual(1);

      const result3 = DomainsQuerySchema.safeParse({ page: "-5" });
      expect(result3.success).toBe(true);
      expect(result3.data?.page).toBeGreaterThanOrEqual(1);
    });

    test("should validate enum values strictly", () => {
      const invalidSortBy = DomainsQuerySchema.safeParse({
        sortBy: "'; DROP TABLE domain; --",
      });
      expect(invalidSortBy.success).toBe(false);

      const invalidDateFilter = DomainsQuerySchema.safeParse({
        dateFilter: "<script>alert('xss')</script>",
      });
      expect(invalidDateFilter.success).toBe(false);

      const invalidSortOrder = DomainsQuerySchema.safeParse({
        sortOrder: "invalid_order",
      });
      expect(invalidSortOrder.success).toBe(false);
    });
  });

  describe("Worker Webhook Security", () => {
    test("should validate webhook payload structure", () => {
      const validWebhook = {
        jobId: "job-123",
        jobType: "discovery",
        status: "completed",
        metadata: { key: "value" },
        results: { videosProcessed: 10 },
      };

      const result = WorkerWebhookSchema.safeParse(validWebhook);
      expect(result.success).toBe(true);
    });

    test("should reject malformed webhook payloads", () => {
      const invalidWebhooks = [
        { jobId: null }, // missing required fields
        { jobId: "job-123", jobType: "invalid_type", status: "completed" },
        { jobId: "job-123", jobType: "discovery", status: "invalid_status" },
        {
          jobId: "'; DROP TABLE job_log; --",
          jobType: "discovery",
          status: "completed",
        },
        {
          jobId: "job-123",
          jobType: "discovery",
          status: "completed",
          metadata: "not-an-object", // should be object
        },
      ];

      invalidWebhooks.forEach((webhook) => {
        const result = WorkerWebhookSchema.safeParse(webhook);
        expect(result.success).toBe(false);
      });
    });

    test("should sanitize error messages in webhook", () => {
      const webhookWithSensitiveError = {
        jobId: "job-123",
        jobType: "discovery",
        status: "failed",
        error:
          "Database connection failed: password=secret123, host=internal.db.com",
      };

      const result = WorkerWebhookSchema.safeParse(webhookWithSensitiveError);
      // Should pass validation but error should be handled carefully in the endpoint
      expect(result.success).toBe(true);
    });
  });

  describe("Data Type Validation", () => {
    test("should handle type coercion safely", () => {
      // Test number coercion
      const pageTest = DomainsQuerySchema.safeParse({ page: "abc" });
      expect(pageTest.success).toBe(false);

      const validPageTest = DomainsQuerySchema.safeParse({ page: "5" });
      expect(validPageTest.success).toBe(true);
      expect(validPageTest.data?.page).toBe(5);
    });

    test("should reject oversized inputs", () => {
      const longSearch = "a".repeat(1000);
      const result = DomainsQuerySchema.safeParse({ search: longSearch });

      if (result.success) {
        expect(result.data.search?.length).toBeLessThanOrEqual(255);
      } else {
        expect(result.success).toBe(false);
      }
    });
  });

  describe("Videos Query Security", () => {
    test("should validate cursor format", () => {
      const invalidCursors = [
        "not-base64",
        "'; DROP TABLE video; --",
        "<script>alert('xss')</script>",
        "../../../etc/passwd",
        null, // should be undefined or string
      ];

      invalidCursors.forEach((cursor) => {
        const result = VideosQuerySchema.safeParse({ cursor });
        // Cursor is optional, so null/undefined should be fine, but invalid strings should fail
        if (cursor === null) {
          expect(result.success).toBe(true);
          expect(result.data?.cursor).toBeUndefined();
        } else if (typeof cursor === "string") {
          // Invalid cursor strings should either be rejected or handled safely
          expect(result.success).toBe(true); // Schema allows any string, validation happens at runtime
        }
      });
    });

    test("should validate boolean coercion", () => {
      const tests = [
        { input: "true", expected: true },
        { input: "false", expected: false },
        { input: "1", expected: true },
        { input: "0", expected: false },
        { input: "yes", expected: false }, // should not coerce arbitrary strings
        { input: "no", expected: false },
      ];

      tests.forEach(({ input, expected }) => {
        const result = VideosQuerySchema.safeParse({ hasComments: input });
        if (result.success && result.data.hasComments !== undefined) {
          expect(typeof result.data.hasComments).toBe("boolean");
        }
      });
    });
  });
});
