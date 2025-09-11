## Prompt 01 — Discovery Configuration

Objective
- Increase candidate URLs by broadening TikTok search and disabling promoted‑only filtering at discovery time.

Changes
- Use `content_type="all"` and `limit=50` when calling the `tiktok.ccl.search` tool.
- Fan out across keywords: `ad`, `sponsored`, `review`, `promo`, `coupon`, `shop`, `amazon`, `skincare`.

Notes
- The gateway’s fallback search extracts TikTok URLs from HTML; promotion status is unreliable at this step. We filter later during enrichment/analysis if needed.

