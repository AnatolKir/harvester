# Prompt 12: Env and Secrets

- Add MCP envs to typed loader: MCP_BASE_URL, BRIGHTDATA_MCP_API_KEY (alias: API_TOKEN), MCP_STICKY_SESSION_MINUTES, DISCOVERY_RPM, COMMENTS_RPM.
- Mark Playwright proxy vars as legacy.

Acceptance:
- `web/lib/env.ts` validates and exposes MCP envs.
- Docs updated in `web/docs/ENVIRONMENT.md`.
