import { NextRequest } from "next/server";
import { GET } from "../route";

// Mock security middleware to bypass authentication
jest.mock("@/lib/security/middleware", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextResponse } = require("next/server");

  return {
    withValidation: jest.fn((schema, handler) => {
      return async (request: NextRequest) => {
        try {
          // Parse query parameters
          const url = new URL(request.url);
          const rawParams = {
            search: url.searchParams.get("search") || undefined,
            dateFilter: url.searchParams.get("dateFilter") || "all",
            page: url.searchParams.get("page") || "1",
            limit: url.searchParams.get("limit") || "50",
            sortBy: url.searchParams.get("sortBy") || "last_seen_at",
            sortOrder: url.searchParams.get("sortOrder") || "desc",
          };

          // Basic validation for invalid parameters
          const page = parseInt(rawParams.page);
          if (page <= 0) {
            return NextResponse.json(
              { success: false, error: "Validation failed" },
              { status: 400 }
            );
          }

          const params = {
            ...rawParams,
            page,
            limit: parseInt(rawParams.limit),
          };

          const context = {
            requestId: "test-request-id",
            clientId: "test-client",
            isAuthenticated: true,
            isSuspicious: false,
            timestamp: Date.now(),
          };

          return handler(request, params, context);
        } catch {
          return NextResponse.json(
            { success: false, error: "Validation failed" },
            { status: 400 }
          );
        }
      };
    }),
    AuthenticatedApiSecurity: {
      requireAuth: true,
      rateLimitConfig: { authenticated: true },
      validatePayload: true,
      corsEnabled: false,
    },
  };
});

// Mock Supabase
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    };

    // Mock the final promise resolution
    Object.assign(mockQuery, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      then: (callback: (result: any) => any) => {
        const result = {
          data: [
            {
              domain: "example.com",
              total_mentions: 5,
              first_seen: "2024-01-01T00:00:00Z",
              last_seen: "2024-01-02T00:00:00Z",
            },
            {
              domain: "test.org",
              total_mentions: 3,
              first_seen: "2024-01-01T00:00:00Z",
              last_seen: "2024-01-02T00:00:00Z",
            },
          ],
          count: 2,
          error: null,
        };
        return Promise.resolve(callback(result));
      },
    });

    return {
      from: jest.fn(() => mockQuery),
    };
  }),
}));

describe("GET /api/domains", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return domains with default pagination", async () => {
    const request = new NextRequest("http://localhost:3000/api/domains");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(2);
    expect(data.pagination).toBeDefined();
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(50);
    expect(data.pagination.total).toBe(2);
  });

  it("should handle search parameter", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/domains?search=example"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
  });

  it("should handle date filtering", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/domains?dateFilter=today"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
  });

  it("should handle pagination parameters", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/domains?page=2&limit=10"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination.page).toBe(2);
    expect(data.pagination.limit).toBe(10);
  });

  it("should handle sort parameters", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/domains?sortBy=mention_count&sortOrder=asc"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
  });

  it("should handle invalid query parameters", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/domains?page=-1"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
  });
});
