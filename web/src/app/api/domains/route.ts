import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Domain = Database["public"]["Tables"]["domain"]["Row"];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const dateFilter = searchParams.get("dateFilter") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // TODO: Replace with actual Supabase query
    // const supabase = await createClient();
    // const query = supabase
    //   .from('domain')
    //   .select('*', { count: 'exact' });

    // if (search) {
    //   query.ilike('domain', `%${search}%`);
    // }

    // if (dateFilter !== 'all') {
    //   const now = new Date();
    //   const dateMap = {
    //     today: new Date(now.setHours(0, 0, 0, 0)),
    //     week: new Date(now.setDate(now.getDate() - 7)),
    //     month: new Date(now.setMonth(now.getMonth() - 1))
    //   };
    //   query.gte('first_seen_at', dateMap[dateFilter].toISOString());
    // }

    // const { data, error, count } = await query
    //   .order('last_seen_at', { ascending: false })
    //   .range(offset, offset + limit - 1);

    // Mock data for now
    const mockDomains: Domain[] = [
      {
        id: "1",
        domain: "shopify.com",
        first_seen_at: "2024-01-15T08:00:00Z",
        last_seen_at: "2024-01-15T14:30:00Z",
        mention_count: 24,
        unique_video_count: 8,
        unique_author_count: 12,
        is_suspicious: false,
        is_active: true,
        metadata: null,
        created_at: "2024-01-15T08:00:00Z",
        updated_at: "2024-01-15T14:30:00Z",
      },
      {
        id: "2",
        domain: "etsy.com",
        first_seen_at: "2024-01-15T09:15:00Z",
        last_seen_at: "2024-01-15T13:45:00Z",
        mention_count: 18,
        unique_video_count: 6,
        unique_author_count: 9,
        is_suspicious: false,
        is_active: true,
        metadata: null,
        created_at: "2024-01-15T09:15:00Z",
        updated_at: "2024-01-15T13:45:00Z",
      },
    ];

    // Apply filters to mock data
    let filteredDomains = mockDomains;

    if (search) {
      filteredDomains = filteredDomains.filter((d) =>
        d.domain.toLowerCase().includes(search.toLowerCase())
      );
    }

    const total = filteredDomains.length;
    const paginatedDomains = filteredDomains.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginatedDomains,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching domains:", error);
    return NextResponse.json(
      { error: "Failed to fetch domains" },
      { status: 500 }
    );
  }
}
