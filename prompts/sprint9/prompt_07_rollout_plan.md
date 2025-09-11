## Prompt 07 — Rollout Plan

Steps
1) Confirm MCP `/health` and `/mcp/tools` are green.
2) Update Vercel `MCP_BASE_URL` to new Railway host; redeploy web.
3) Run discovery with 2–3 keywords; validate URLs flow into DB.
4) Enable enrichment for a subset (e.g., 100 videos) and validate saves/redirects.
5) Ramp keywords and RPM; monitor 429/CAPTCHA and success rate.

