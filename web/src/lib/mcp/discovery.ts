import { MCPClient } from "./client";

export async function fetchPromotedVideoIds(
  client: MCPClient,
  {
    region = "US",
    windowHours = 6,
    pageSize = 100,
    offsetHours,
  }: {
    region?: string;
    windowHours?: number;
    pageSize?: number;
    offsetHours?: number;
  } = {}
) {
  // The MCP tool name & params should match Bright Data’s docs / your configured server
  const idempotencyKey = `discovery:${region}:${windowHours}:${pageSize}:${offsetHours ?? 0}`;
  const resp = await client.call(
    "tiktok.ccl.search",
    {
      region,
      windowHours,
      pageSize,
      ...(offsetHours !== undefined ? { offsetHours } : {}),
    },
    { idempotencyKey }
  );
  // Normalize into [{ video_id, url, advertiser, seen_at }]
  const maybeItems = (resp as { items?: unknown })?.items;
  const items: unknown[] = Array.isArray(maybeItems) ? maybeItems : [];
  const normalized = items.map((raw: unknown) => {
    const x = (raw as Record<string, unknown>) || {};
    const videoId = String(
      (x.video_id as string | undefined) ?? (x.id as string | undefined) ?? ""
    );
    const url = String((x.url as string | undefined) ?? "");
    const advertiser = (x.advertiser as string | null | undefined) ?? null;
    const seen_at =
      (x.seen_at as string | undefined) ??
      (x.updated_at as string | undefined) ??
      new Date().toISOString();
    return { video_id: videoId, url, advertiser, seen_at };
  });
  return normalized.filter((r) => r.video_id && r.url);
}
