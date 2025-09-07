import { MCPClient } from './client';

export async function fetchPromotedVideoIds(
  client: MCPClient,
  { region = 'US', windowHours = 6, pageSize = 100 } = {}
) {
  // The MCP tool name & params should match Bright Data’s docs / your configured server
  const resp = await client.call('tiktok.ccl.search', { region, windowHours, pageSize });
  // Normalize into [{ video_id, url, advertiser, seen_at }]
  return (resp.items ?? []).map((x: any) => ({
    video_id: String(x.video_id ?? x.id ?? ''),
    url: String(x.url ?? ''),
    advertiser: x.advertiser ?? null,
    seen_at: x.seen_at ?? x.updated_at ?? new Date().toISOString(),
  })).filter((r: any) => r.video_id && r.url);
}


