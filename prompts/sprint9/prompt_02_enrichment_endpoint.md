## Prompt 02 — MCP Enrichment Endpoint (`tiktok.enrich.links`)

Purpose
- Given a TikTok `video_url`, fetch the video page (and optionally the creator profile) via Bright Data and extract all links. Follow redirects to produce `final_url` and `final_host` while keeping raw strings intact.

Request
```json
{
  "video_url": "https://www.tiktok.com/@user/video/1234567890",
  "include_profile": true
}
```

Response (array)
```json
[
  {
    "video_id": "1234567890",
    "raw_url": "https://bit.ly/x",
    "final_url": "https://brandshop.com/p/1",
    "raw_host": "bit.ly",
    "final_host": "brandshop.com",
    "source": "video"
  }
]
```

Notes
- Do not normalize or dedupe in the tool. Dedupe occurs downstream on `(video_id, raw_url)`.
- Timeout budget: 20s per fetch; retry on 429 with exponential backoff.

