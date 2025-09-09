import { describe, expect, test, beforeEach } from "@jest/globals";
import { getAllowedAdminOrigins } from "../admin";

describe("Admin Security Helpers", () => {
  const prevBase = process.env.NEXT_PUBLIC_BASE_URL;
  const prevAllowed = process.env.ADMIN_ALLOWED_ORIGINS;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://app.example.com";
    process.env.ADMIN_ALLOWED_ORIGINS =
      "https://admin.example.com, https://staging.example.com";
  });

  test("getAllowedAdminOrigins merges env allowlist with base URL", () => {
    const origins = getAllowedAdminOrigins();
    expect(origins).toContain("https://app.example.com");
    expect(origins).toContain("https://admin.example.com");
    expect(origins).toContain("https://staging.example.com");
    // No duplicates
    expect(new Set(origins).size).toBe(origins.length);
  });

  test("getAllowedAdminOrigins handles empty env values", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "";
    process.env.ADMIN_ALLOWED_ORIGINS = "";
    const origins = getAllowedAdminOrigins();
    expect(origins.length).toBe(0);
  });

  // Restore env after tests
  afterAll(() => {
    process.env.NEXT_PUBLIC_BASE_URL = prevBase;
    process.env.ADMIN_ALLOWED_ORIGINS = prevAllowed;
  });
});
