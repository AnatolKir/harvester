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
        // Parse path and query parameters
        const url = new URL(request.url);
        const pathParts = url.pathname.split("/");
        const domainId = pathParts[pathParts.indexOf("domains") + 1];
        const params = {
          id: domainId,
          since: url.searchParams.get("since"),
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

// Mock Supabase with controllable batches
jest.mock("@/lib/supabase/server", () => {
  let call = 0;
  const chain = () => ({
    select: jest.fn(() => chain()),
    order: jest.fn(() => chain()),
    gte: jest.fn(() => chain()),
    eq: jest.fn(() => chain()),
    in: jest.fn(() => ({ data: [], error: null })),
    range: jest.fn(() => {
      // @ts-expect-error - test-only global
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
    maybeSingle: jest.fn(() => ({
      data: { domain: "example.com" },
      error: null,
    })),
  });
  return {
    createClient: jest.fn(() => ({ from: jest.fn(() => chain()) })),
    // @ts-expect-error test helper to reset mock call counter
    __resetCalls: () => {
      call = 0;
    },
  };
});

describe("GET /api/domains/[id]/mentions/export", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should respond with CSV content-type", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/domains/550e8400-e29b-41d4-a716-446655440000/mentions/export?since=2024-01-01T00:00:00Z"
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
          comment_id: "c1",
          video_id: null,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      [
        {
          domain: "example.com",
          comment_id: "c2",
          video_id: null,
          created_at: "2024-01-02T00:00:00.000Z",
        },
      ],
      [],
    ];

    const request = new NextRequest(
      "http://localhost:3000/api/domains/550e8400-e29b-41d4-a716-446655440000/mentions/export?since=2024-01-01T00:00:00Z"
    );
    const response = await GET(request);

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
    expect(chunks[0]).toBe("domain,comment_id,video_id,video_url,created_at\n");
    expect(chunks[1]).toContain("c1");
    expect(chunks[2]).toContain("c2");
  });
});
