import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Comment = Database["public"]["Tables"]["comment"]["Row"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // TODO: Replace with actual Supabase query
    // const supabase = await createClient();
    // const { data, error, count } = await supabase
    //   .from('comment')
    //   .select(`
    //     *,
    //     video:video_id (
    //       title,
    //       url,
    //       is_promoted
    //     )
    //   `, { count: 'exact' })
    //   .eq('domain_id', id)
    //   .order('posted_at', { ascending: false })
    //   .range(offset, offset + limit - 1);

    // Mock data for now
    const mockComments = [
      {
        id: "c1",
        video_id: "v1",
        tiktok_comment_id: "tk_c1",
        author_username: "user123",
        author_display_name: "Shopping Enthusiast",
        content: "Check out my store at shopify.com/mystore for amazing deals!",
        like_count: 45,
        reply_count: 3,
        is_author_reply: false,
        posted_at: "2024-01-15T14:00:00Z",
        created_at: "2024-01-15T14:05:00Z",
        metadata: null,
        video: {
          title: "Best Products 2024",
          url: "https://tiktok.com/@user/video/123",
          is_promoted: true,
        },
      },
      {
        id: "c2",
        video_id: "v2",
        tiktok_comment_id: "tk_c2",
        author_username: "seller456",
        author_display_name: "Fashion Seller",
        content:
          "We just launched our new collection on shopify.com! Use code TIKTOK20",
        like_count: 128,
        reply_count: 15,
        is_author_reply: false,
        posted_at: "2024-01-15T12:30:00Z",
        created_at: "2024-01-15T12:35:00Z",
        metadata: null,
        video: {
          title: "Fashion Trends",
          url: "https://tiktok.com/@seller/video/456",
          is_promoted: true,
        },
      },
    ];

    const total = mockComments.length;
    const paginatedComments = mockComments.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginatedComments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}
