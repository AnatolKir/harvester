import { NextRequest } from "next/server";
import { GET } from "../route";

// Mock Supabase
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({
        data: [
          {
            id: "1",
            domain: "example.com",
            first_seen_at: "2024-01-01T00:00:00Z",
            last_seen_at: "2024-01-02T00:00:00Z",
            mention_count: 5,
            is_url_shortener: false,
            category: "standard",
            created_at: "2024-01-01T00:00:00Z",
          },
          {
            id: "2",
            domain: "test.org",
            first_seen_at: "2024-01-01T00:00:00Z",
            last_seen_at: "2024-01-02T00:00:00Z",
            mention_count: 3,
            is_url_shortener: false,
            category: "standard",
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
        count: 2,
        error: null,
      }),
    })),
  })),
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
