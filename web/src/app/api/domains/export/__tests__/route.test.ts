import { NextRequest } from "next/server";
import { GET } from "../route";

// Mock Supabase for streaming queries
jest.mock("@/lib/supabase/server", () => {
  const chain = () => ({
    select: jest.fn(() => chain()),
    order: jest.fn(() => chain()),
    gte: jest.fn(() => chain()),
    range: jest.fn(() => ({ data: [], error: null })),
  });
  return {
    createClient: jest.fn(() => ({ from: jest.fn(() => chain()) })),
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
});
