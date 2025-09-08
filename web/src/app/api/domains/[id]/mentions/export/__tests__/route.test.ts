import { NextRequest } from "next/server";
import { GET } from "../route";

// Mock Supabase
jest.mock("@/lib/supabase/server", () => {
  const chain = () => ({
    select: jest.fn(() => chain()),
    order: jest.fn(() => chain()),
    gte: jest.fn(() => chain()),
    eq: jest.fn(() => chain()),
    range: jest.fn(() => ({ data: [], error: null })),
    maybeSingle: jest.fn(() => ({
      data: { domain: "example.com" },
      error: null,
    })),
  });
  return {
    createClient: jest.fn(() => ({ from: jest.fn(() => chain()) })),
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
});
