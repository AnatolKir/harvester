# Prompt 16: Pipeline Refactor

- Remove reliance on external worker HTTP endpoints.
- Inngest jobs perform discovery and harvesting directly via MCP.
- Use canonical schema names in all writes.

Acceptance:
- No calls to WORKER_WEBHOOK_URL; only Supabase and MCP used.
- Jobs idempotent and retry-safe.
