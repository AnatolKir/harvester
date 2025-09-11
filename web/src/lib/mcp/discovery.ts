import { MCPClient } from "./client";

export async function fetchPromotedVideoIds(
  client: MCPClient,
  {
    region = "US",
    keywords,
    limit = 50,
    contentType = "all",
  }: {
    region?: string;
    keywords?: string[] | string;
    limit?: number;
    contentType?: "promoted" | "all";
  } = {}
) {
  // Build a broad default keyword list if none provided
  const keywordList = Array.isArray(keywords)
    ? keywords
    : typeof keywords === "string" && keywords.trim().length > 0
      ? [keywords]
      : [
          "sale",
          "deal",
          "coupon",
          "fashion",
          "beauty",
          "tech",
          "gadgets",
          "home",
        ];

  const params = {
    keywords: keywordList.join(" "),
    limit,
    country: region,
    content_type: contentType,
  } as Record<string, unknown>;

  const idempotencyKey = `discovery:${region}:${contentType}:${limit}:${keywordList.join(",")}`;
  const resp = await client.call("tiktok.ccl.search", params, {
    idempotencyKey,
  });

  // Gateway returns { success, tool, result, ... }
  const resultItems = Array.isArray((resp as { result?: unknown[] }).result)
    ? ((resp as { result?: unknown[] }).result as unknown[])
    : [];

  // Normalize into [{ video_id, url, advertiser, seen_at }]
  const normalized = resultItems.map((raw: unknown) => {
    const x = (raw as Record<string, unknown>) || {};
    const videoId = String(
      (x.id as string | undefined) ?? (x.video_id as string | undefined) ?? ""
    );
    const url = String((x.url as string | undefined) ?? "");
    const advertiser = (x.advertiser as string | null | undefined) ?? null;
    const seen_at =
      (x.discovered_at as string | undefined) ??
      (x.seen_at as string | undefined) ??
      new Date().toISOString();
    return { video_id: videoId, url, advertiser, seen_at };
  });

  return normalized.filter((r) => r.video_id && r.url);
}
