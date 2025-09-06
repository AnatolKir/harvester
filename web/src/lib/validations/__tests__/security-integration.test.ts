import { describe, expect, test, beforeAll, afterAll } from "@jest/globals";
import { SecurityUtils } from "../../security";

describe("Security Integration Tests", () => {
  describe("SQL Injection Protection", () => {
    test("should detect and sanitize SQL injection attempts", () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin' UNION SELECT * FROM passwords --",
        "'; DELETE FROM domain WHERE id='1'; --",
        "' OR 1=1 /*",
        "admin'/**/OR/**/1=1/**/--",
      ];

      maliciousInputs.forEach((input) => {
        expect(SecurityUtils.SQL.containsSQLInjection(input)).toBe(true);

        const sanitized = SecurityUtils.SQL.sanitizeSQLInput(input);
        expect(SecurityUtils.SQL.containsSQLInjection(sanitized)).toBe(false);
        expect(sanitized).not.toContain("'");
        expect(sanitized).not.toContain(";");
        expect(sanitized).not.toContain("--");
      });
    });

    test("should preserve safe search queries", () => {
      const safeInputs = [
        "example.com",
        "search term",
        "domain with spaces",
        "test123",
        "company.org",
      ];

      safeInputs.forEach((input) => {
        expect(SecurityUtils.SQL.containsSQLInjection(input)).toBe(false);

        const sanitized = SecurityUtils.SQL.sanitizeSQLInput(input);
        expect(sanitized.length).toBeGreaterThan(0);
      });
    });
  });

  describe("XSS Protection", () => {
    test("should detect and sanitize XSS attempts", () => {
      const xssInputs = [
        "<script>alert('xss')</script>",
        "<img src=x onerror=alert('xss')>",
        "<svg onload=alert('xss')>",
        "javascript:alert('xss')",
        "<iframe src=javascript:alert()></iframe>",
        "<div onclick='alert()'>click</div>",
      ];

      xssInputs.forEach((input) => {
        expect(SecurityUtils.XSS.containsXSS(input)).toBe(true);

        const sanitized = SecurityUtils.XSS.sanitizeXSS(input);
        expect(sanitized).not.toContain("<script");
        expect(sanitized).not.toContain("javascript:");
        expect(sanitized).not.toContain("onerror");
        expect(sanitized).not.toContain("onload");
        expect(sanitized).not.toContain("onclick");
      });
    });
  });

  describe("Input Validation", () => {
    test("should validate search queries comprehensively", () => {
      const testCases = [
        { input: "normal search", expected: "normal search" },
        { input: "'; DROP TABLE users; --", expected: null }, // Should be sanitized to nothing
        { input: "<script>alert()</script>", expected: null }, // Should be sanitized to nothing
        { input: "a".repeat(300), expected: "a".repeat(255) }, // Should be truncated
        { input: "  whitespace  ", expected: "whitespace" }, // Should be trimmed
        { input: "", expected: null },
        { input: null, expected: null },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = SecurityUtils.Input.validateSearchQuery(input);
        if (expected === null) {
          expect(result).toBeNull();
        } else {
          expect(result).toBe(expected);
        }
      });
    });

    test("should validate UUIDs strictly", () => {
      const validUUIDs = [
        "550e8400-e29b-41d4-a716-446655440000",
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "12345678-1234-4234-8234-123456789012",
      ];

      const invalidUUIDs = [
        "not-a-uuid",
        "550e8400-e29b-41d4-a716-44665544000", // too short
        "550e8400xe29bx41d4xa716x446655440000", // wrong format
        "'; DROP TABLE domain; --",
        "<script>alert('xss')</script>",
        "123",
        "",
      ];

      validUUIDs.forEach((uuid) => {
        expect(SecurityUtils.Input.isValidUUID(uuid)).toBe(true);
      });

      invalidUUIDs.forEach((uuid) => {
        expect(SecurityUtils.Input.isValidUUID(uuid)).toBe(false);
      });
    });

    test("should validate cursor format", () => {
      // Valid cursor (base64 encoded timestamp)
      const validCursor = Buffer.from(new Date().toISOString()).toString(
        "base64"
      );
      expect(SecurityUtils.Input.isValidCursor(validCursor)).toBe(true);

      const invalidCursors = [
        "not-base64",
        "'; DROP TABLE video; --",
        "<script>alert('xss')</script>",
        Buffer.from("not-a-date").toString("base64"),
        "",
      ];

      invalidCursors.forEach((cursor) => {
        expect(SecurityUtils.Input.isValidCursor(cursor)).toBe(false);
      });
    });

    test("should sanitize error messages", () => {
      const sensitiveError =
        "Connection failed: password=secret123, host=internal.db.com, user=admin@company.com";
      const sanitized =
        SecurityUtils.Input.sanitizeErrorMessage(sensitiveError);

      expect(sanitized).not.toContain("secret123");
      expect(sanitized).not.toContain("internal.db.com");
      expect(sanitized).not.toContain("admin@company.com");
      expect(sanitized).toContain("[REDACTED]");
    });
  });

  describe("Authentication Security", () => {
    test("should validate webhook tokens securely", () => {
      const correctToken = "secure-webhook-token-123";
      const wrongTokens = [
        "wrong-token",
        "secure-webhook-token-124", // Close but wrong
        "",
        "secure-webhook-token-123 ", // Extra space
        "SECURE-WEBHOOK-TOKEN-123", // Different case
      ];

      expect(
        SecurityUtils.Auth.validateWebhookToken(correctToken, correctToken)
      ).toBe(true);

      wrongTokens.forEach((token) => {
        expect(
          SecurityUtils.Auth.validateWebhookToken(token, correctToken)
        ).toBe(false);
      });

      // Test with empty expected token
      expect(SecurityUtils.Auth.validateWebhookToken(correctToken, "")).toBe(
        false
      );
    });

    test("should extract Bearer tokens correctly", () => {
      const testCases = [
        { input: "Bearer token123", expected: "token123" },
        { input: "Bearer ", expected: "" },
        { input: "Basic token123", expected: null },
        { input: "token123", expected: null },
        { input: "", expected: null },
        { input: null, expected: null },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(SecurityUtils.Auth.extractBearerToken(input)).toBe(expected);
      });
    });

    test("should generate secure request IDs", () => {
      const id1 = SecurityUtils.Auth.generateRequestId();
      const id2 = SecurityUtils.Auth.generateRequestId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2); // Should be unique
      expect(id1.length).toBe(16); // Should be 16 characters
      expect(/^[a-f0-9]{16}$/.test(id1)).toBe(true); // Should be hex
    });
  });

  describe("Rate Limit Security", () => {
    test("should detect suspicious requests", () => {
      const mockRequest = (userAgent: string) =>
        ({
          headers: {
            get: (name: string) => (name === "user-agent" ? userAgent : null),
          },
        }) as any;

      const suspiciousUAs = [
        "sqlmap/1.0",
        "python-requests/2.28.0",
        "curl/7.68.0",
        "wget/1.20.3",
        "Nmap Scripting Engine",
        "",
      ];

      const normalUAs = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      ];

      suspiciousUAs.forEach((ua) => {
        expect(
          SecurityUtils.RateLimit.isSuspiciousRequest(mockRequest(ua))
        ).toBe(true);
      });

      normalUAs.forEach((ua) => {
        expect(
          SecurityUtils.RateLimit.isSuspiciousRequest(mockRequest(ua))
        ).toBe(false);
      });
    });
  });

  describe("Data Validation Security", () => {
    test("should validate pagination parameters", () => {
      const testCases = [
        { input: { page: 1, limit: 10 }, expected: { page: 1, limit: 10 } },
        { input: { page: -5, limit: 200 }, expected: { page: 1, limit: 100 } },
        {
          input: { page: 99999, limit: -10 },
          expected: { page: 10000, limit: 1 },
        },
        { input: { page: 0, limit: 0 }, expected: { page: 1, limit: 1 } },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = SecurityUtils.Data.validatePagination(
          input.page,
          input.limit
        );
        expect(result).toEqual(expected);
      });
    });

    test("should validate date ranges", () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const veryOld = new Date("2020-01-01");

      expect(SecurityUtils.Data.validateDateRange()).toBe(true); // No dates
      expect(SecurityUtils.Data.validateDateRange(yesterday, now)).toBe(true); // Valid range
      expect(SecurityUtils.Data.validateDateRange(now, yesterday)).toBe(false); // Invalid order
      expect(SecurityUtils.Data.validateDateRange(tomorrow, undefined)).toBe(
        false
      ); // Future date
      expect(SecurityUtils.Data.validateDateRange(veryOld, undefined)).toBe(
        false
      ); // Too old
    });

    test("should validate JSON payload size and structure", () => {
      const validPayload = { key: "value", nested: { data: 123 } };
      const oversizedPayload = { data: "x".repeat(2 * 1024 * 1024) }; // > 1MB

      expect(SecurityUtils.Data.validateJsonPayload(validPayload)).toBe(true);
      expect(SecurityUtils.Data.validateJsonPayload(oversizedPayload)).toBe(
        false
      );

      // Test deep nesting
      const deepPayload: any = {};
      let current = deepPayload;
      for (let i = 0; i < 15; i++) {
        current.nested = {};
        current = current.nested;
      }
      expect(SecurityUtils.Data.validateJsonPayload(deepPayload)).toBe(false);
    });
  });
});
