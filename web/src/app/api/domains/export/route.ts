import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  withSecurity,
  AuthenticatedApiSecurity,
} from "@/lib/security/middleware";
import { DateFilterSchema } from "@/lib/validations/api";
import { addRateLimitHeaders } from "@/lib/api";

const ExportQuerySchema = z.object({
  dateFilter: DateFilterSchema.shape.dateFilter.optional().default("all"),
});

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function getThresholdForDateFilter(dateFilter: string): string | null {
  if (dateFilter === "all") return null;
  const now = new Date();
  switch (dateFilter) {
    case "today":
      now.setHours(0, 0, 0, 0);
      return now.toISOString();
    case "week":
      now.setDate(now.getDate() - 7);
      return now.toISOString();
    case "month":
      now.setMonth(now.getMonth() - 1);
      return now.toISOString();
    default:
      return null;
  }
}

export const GET = withSecurity(async (request) => {
  // Validate query
  const searchParams = request.nextUrl.searchParams;
  const parsed = ExportQuerySchema.parse({
    dateFilter: searchParams.get("dateFilter") ?? undefined,
  });

  const supabase = await createClient();

  // Prepare CSV generator configuration
  const encoder = new TextEncoder();
  const chunkSize = 1000;
  const threshold = getThresholdForDateFilter(parsed.dateFilter);

  // Prepare filename
  const ts = new Date().toISOString().split("T")[0];
  const filename = `domains_export_${ts}.csv`;

  async function* generateCsvChunks(): AsyncGenerator<string, void, void> {
    try {
      // Header row first
      yield "domain,total_mentions,first_seen,last_seen\n";

      let offset = 0;
      // Iterate in chunks to keep memory bounded

      while (true) {
        let query = supabase
          .from("v_domains_overview")
          .select("domain,total_mentions,first_seen,last_seen")
          .order("last_seen", { ascending: false })
          .range(offset, offset + chunkSize - 1);

        if (threshold) {
          query = query.gte("first_seen", threshold);
        }

        const { data, error } = await query;
        if (error) {
          throw new Error(`Database query failed: ${error.message}`);
        }

        const rows = (data || []) as Array<{
          domain: string;
          total_mentions: number;
          first_seen: string;
          last_seen: string;
        }>;

        if (rows.length === 0) {
          break;
        }

        let csvChunk = "";
        for (const row of rows) {
          csvChunk += `${csvEscape(row.domain)},${csvEscape(
            row.total_mentions
          )},${csvEscape(row.first_seen)},${csvEscape(row.last_seen)}\n`;
        }
        yield csvChunk;
        offset += rows.length;

        if (rows.length < chunkSize) {
          break; // completed
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      // Append an error footer so partial results are still downloadable
      yield `# export_error: ${csvEscape(message)}\n`;
    }
  }

  // Create a stream that pulls from the async generator (backpressure-aware)
  const iterator: AsyncGenerator<string, void, void> = generateCsvChunks();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(value as string));
    },
    async cancel() {
      if (typeof iterator.return === "function") {
        try {
          await iterator.return();
        } catch {
          // ignore
        }
      }
    },
  });

  const response = new NextResponse(stream as unknown as BodyInit, {
    headers: new Headers({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${filename}`,
      "Cache-Control": "no-store",
    }),
  });

  // Add rate limit headers (static example values consistent with other endpoints)
  return addRateLimitHeaders(response, {
    limit: 1000,
    remaining: 999,
    reset: Math.floor(Date.now() / 1000) + 3600,
  });
}, AuthenticatedApiSecurity);
