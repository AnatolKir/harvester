## Prompt 05 — Rate Limiting

Recommended starting values
- Discovery RPM: 30–60 (concurrency 3–5)
- Enrichment RPM: 60–120 (concurrency 5–8)
- Jitter ±30%; ramp up gradually while monitoring 429/CAPTCHA.

Environment variables (already supported)
- `DISCOVERY_RPM`, `COMMENTS_RPM`, `HTTP_ENRICH_RPM` (defaults 30/60/30).

