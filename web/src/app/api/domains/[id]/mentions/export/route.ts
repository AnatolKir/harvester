import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  withSecurity,
  AuthenticatedApiSecurity,
} from "@/lib/security/middleware";
import { addRateLimitHeaders } from "@/lib/api";

const MentionsExportQuerySchema = z.object({
  since: z.string().datetime().optional(),
});

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const GET = withSecurity(async (request: NextRequest) => {
  const supabase = await createClient();

  // Resolve domain id -> domain name
  const idSegment = decodeURIComponent(
    request.nextUrl.pathname.split("/domains/")[1].split("/mentions")[0]
  );

  const { data: domainRow, error: domainError } = await supabase
    .from("domain")
    .select("domain")
    .eq("id", idSegment)
    .maybeSingle();

  if (domainError) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: `Domain lookup failed: ${domainError.message}`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!domainRow?.domain) {
    return new NextResponse("", {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=mentions_export_empty.csv`,
        "Cache-Control": "no-store",
      },
    });
  }

  // Validate query params
  const searchParams = request.nextUrl.searchParams;
  const { since } = MentionsExportQuerySchema.parse({
    since: searchParams.get("since") ?? undefined,
  });

  const encoder = new TextEncoder();
  const chunkSize = 1000;
  const domain = domainRow.domain as string;

  const ts = new Date().toISOString().split("T")[0];
  const safeDomain = domain.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const filename = `mentions_export_${safeDomain}_${ts}.csv`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // header (add video_url)
      controller.enqueue(
        encoder.encode("domain,comment_id,video_id,video_url,created_at\n")
      );

      let offset = 0;
      while (true) {
        let query = supabase
          .from("v_domain_mentions_recent")
          .select("domain,comment_id,video_id,created_at")
          .eq("domain", domain)
          .order("created_at", { ascending: false })
          .range(offset, offset + chunkSize - 1);

        if (since) {
          query = query.gte("created_at", since);
        }

        const { data, error } = await query;
        if (error) {
          controller.error(
            new Error(`Database query failed: ${error.message}`)
          );
          return;
        }

        const rows = data || [];
        if (rows.length === 0) break;

        // Lookup video URLs for this chunk (schema-agnostic mapping)
        const videoIds = Array.from(
          new Set(
            (rows as Array<{ video_id: string | null }>)
              .map((r) => r.video_id)
              .filter((v): v is string => Boolean(v))
          )
        );

        const videoUrlById: Record<string, string> = {};
        if (videoIds.length > 0) {
          const { data: videoRows } = await supabase
            .from("video")
            .select("id,url,video_url,video_id")
            .in("id", videoIds);
          for (const v of (videoRows || []) as Array<{
            id: string;
            url?: string | null;
            video_url?: string | null;
            video_id?: string | null;
          }>) {
            const url =
              v.url ||
              v.video_url ||
              (v.video_id
                ? `https://www.tiktok.com/@/video/${v.video_id}`
                : "");
            videoUrlById[v.id] = url || "";
          }
        }

        let csvChunk = "";
        for (const row of rows as Array<{
          domain: string;
          comment_id: string | null;
          video_id: string | null;
          created_at: string;
        }>) {
          const videoUrl = row.video_id ? videoUrlById[row.video_id] || "" : "";
          csvChunk += `${csvEscape(row.domain)},${csvEscape(
            row.comment_id
          )},${csvEscape(row.video_id)},${csvEscape(videoUrl)},${csvEscape(row.created_at)}\n`;
        }
        controller.enqueue(encoder.encode(csvChunk));
        offset += rows.length;
        if (rows.length < chunkSize) break;
      }

      controller.close();
    },
  });

  const response = new NextResponse(stream as unknown as BodyInit, {
    headers: new Headers({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${filename}`,
      "Cache-Control": "no-store",
    }),
  });

  return addRateLimitHeaders(response, {
    limit: 1000,
    remaining: 999,
    reset: Math.floor(Date.now() / 1000) + 3600,
  });
}, AuthenticatedApiSecurity);
