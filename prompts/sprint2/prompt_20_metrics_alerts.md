# Prompt 20: Metrics & Alerts

- Add `/api/metrics/rate-limits` endpoint and secure it.
- Expose counters and abuse patterns via Redis metrics.
- Optional: basic alerting for high abuse rate.

Acceptance:
- Endpoint returns metrics JSON behind auth.
- Logs indicate alerts when thresholds exceeded.
