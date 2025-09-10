import { NextRequest } from "next/server";
import { GET } from "../route";

// Mock security middleware to bypass authentication
jest.mock("@/lib/security/middleware", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars
  const { NextResponse } = require("next/server");

  return {
    withSecurity: jest.fn((handler) => {
      return async (request: NextRequest) => {
        const context = {
          requestId: "test-request-id",
          clientId: "test-client",
          isAuthenticated: true,
          isSuspicious: false,
          timestamp: Date.now(),
        };

        return handler(request, context);
      };
    }),
    withValidation: jest.fn((schema, handler) => {
      return async (request: NextRequest) => {
        // Parse query parameters
        const url = new URL(request.url);
        const params = {
          dateFilter: url.searchParams.get("dateFilter") || "all",
        };

        const context = {
          requestId: "test-request-id",
          clientId: "test-client",
          isAuthenticated: true,
          isSuspicious: false,
          timestamp: Date.now(),
        };

        return handler(request, params, context);
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

// Mock Supabase with controllable batches for range()
jest.mock("@/lib/supabase/server", () => {
  let call = 0;
  const chain = () => ({
    select: jest.fn(() => chain()),
    order: jest.fn(() => chain()),
    gte: jest.fn(() => chain()),
    range: jest.fn(() => {
      // @ts-expect-error test-only global
      const batches =
        (
          global as unknown as {
            __csvBatches?: Array<Record<string, unknown>[]>;
          }
        ).__csvBatches || [];
      const data = batches[call] ?? [];
      call += 1;
      return { data, error: null };
    }),
  });
  return {
    createClient: jest.fn(() => ({
      from: jest.fn(() => chain()),
    })),
    // @ts-expect-error - expose test control
    __resetCalls: () => {
      call = 0;
    },
  };
});

describe("GET /api/domains/export", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should respond with CSV content-type", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/domains/export?dateFilter=all"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
  });

  it.skip("streams header first and multiple data chunks", async () => {
    // @ts-expect-error test-only global for batches
    global.__csvBatches = [
      [
        {
          domain: "example.com",
          total_mentions: 5,
          first_seen: "2024-01-01T00:00:00.000Z",
          last_seen: "2024-01-02T00:00:00.000Z",
        },
      ],
      [
        {
          domain: "another.com",
          total_mentions: 2,
          first_seen: "2024-01-03T00:00:00.000Z",
          last_seen: "2024-01-04T00:00:00.000Z",
        },
      ],
      [],
    ];

    const request = new NextRequest(
      "http://localhost:3000/api/domains/export?dateFilter=all"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);

    const body = (response as unknown as Response)
      .body as ReadableStream<Uint8Array>;
    const reader = body.getReader();
    const decoder = new TextDecoder();
    const chunks: string[] = [];

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(decoder.decode(value));
    }

    expect(chunks.length).toBeGreaterThanOrEqual(3); // header + 2 data chunks
    expect(chunks[0]).toBe("domain,total_mentions,first_seen,last_seen\n");
    expect(chunks[1]).toContain("example.com");
    expect(chunks[2]).toContain("another.com");
  });
});
