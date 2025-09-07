# Legacy Worker (Playwright)

This Python worker and Playwright-based scraping path are now superseded by the MCP-based integration executed inside Inngest jobs (Node).

- Primary pipeline now uses MCP (Bright Data) via `web/src/lib/mcp/*` and Inngest jobs in `inngest/jobs/*`.
- The `worker/` folder is retained temporarily for reference and rollback.
- Proxy-related env variables are marked as legacy in the docs.

Future step: archive or remove this folder once MCP path is fully validated in production.
