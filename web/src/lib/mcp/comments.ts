import { MCPClient } from './client';

export async function fetchCommentsForVideo(
  client: MCPClient,
  videoId: string,
  { maxPages = 2 } = {}
) {
  let sessionId: string | undefined;
  const out: any[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const idempotencyKey = `comments:${videoId}:${page}`;
    const resp = await client.call(
      'tiktok.comments.page',
      { videoId, page },
      { sticky: true, sessionId, idempotencyKey }
    );
    sessionId = resp.sessionId ?? sessionId;
    const items = (resp.items ?? [])
      .map((c: any) => ({
        comment_id: String(c.id ?? ''),
        text: String(c.text ?? ''),
        user_id: String(c.user_id ?? ''),
        created_at: c.created_at ?? null,
        lang: c.lang ?? null,
      }))
      .filter((c: any) => c.comment_id && c.text);
    out.push(...items);
    if (!resp.hasMore) break;
  }
  return out;
}


