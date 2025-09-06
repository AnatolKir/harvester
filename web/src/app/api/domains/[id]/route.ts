import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Domain = Database["public"]["Tables"]["domain"]["Row"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // TODO: Replace with actual Supabase query
    // const supabase = await createClient();
    // const { data, error } = await supabase
    //   .from('domain')
    //   .select('*')
    //   .eq('id', id)
    //   .single();

    // Mock data for now
    const mockDomain: Domain = {
      id: id,
      domain: "shopify.com",
      first_seen_at: "2024-01-15T08:00:00Z",
      last_seen_at: "2024-01-15T14:30:00Z",
      mention_count: 24,
      unique_video_count: 8,
      unique_author_count: 12,
      is_suspicious: false,
      is_active: true,
      metadata: {
        tags: ["e-commerce", "dropshipping"],
        notes: "Frequently mentioned in promotional videos",
      },
      created_at: "2024-01-15T08:00:00Z",
      updated_at: "2024-01-15T14:30:00Z",
    };

    if (!mockDomain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    return NextResponse.json({ data: mockDomain });
  } catch (error) {
    console.error("Error fetching domain:", error);
    return NextResponse.json(
      { error: "Failed to fetch domain" },
      { status: 500 }
    );
  }
}
