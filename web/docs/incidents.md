# Incident Runbooks

Concise, step-by-step procedures for common incidents. Each runbook follows Detection → Diagnosis → Mitigation → Verification. Thresholds align with alert conditions defined in the system (e.g., job success rate < 70%, no successful discovery in 30+ minutes, no successful harvesting in 60+ minutes, DLQ size ≥ 10).

---

## 1) Rate Limit Saturation (429s / Token Bucket Exhaustion)

### Detection

- Alerts fire when job success rate drops below 70% and/or error spikes with 429 status codes.
- Web UI: `/admin/jobs` → watch success rate and error breakdowns.
- Logs: `/admin/logs` → filter by `level=error` and `event_type` containing `rate_limit` or `429`.

Quick check via API:

```bash
curl -s "https://yourdomain.com/api/admin/jobs?hours=1" | jq '{successRate: .data.successRate, errors: .data.errorCounts}'
```

### Diagnosis

- Identify which pipeline is saturating limits:
  - Discovery vs Harvesting vs HTTP Enrichment.
  - Look for recent changes (deployments, traffic spikes, provider throttling).
- Confirm configured RPMs and concurrency:
  - Environment variables: `DISCOVERY_RPM`, `COMMENTS_RPM`, `HTTP_ENRICH_RPM`.
  - Concurrency config keys (if enabled): `max_concurrent_discovery_jobs`, `max_concurrent_harvesting_jobs`.
- Check platform/provider status (e.g., Upstash, MCP provider) for broader throttling.

### Mitigation

- Short-term load reduction (no deploy required):
  - Reduce concurrency via Admin Config API:

    ```bash
    # Lower discovery concurrency to 2
    curl -s -X POST "https://yourdomain.com/api/admin/config" \
      -H "Content-Type: application/json" \
      -d '{"key":"max_concurrent_discovery_jobs","value":2,"description":"Throttle discovery during rate limit incident"}' | jq

    # Lower harvesting concurrency to 5
    curl -s -X POST "https://yourdomain.com/api/admin/config" \
      -H "Content-Type: application/json" \
      -d '{"key":"max_concurrent_harvesting_jobs","value":5,"description":"Throttle harvesting during rate limit incident"}' | jq
    ```

- If saturation persists, adjust RPMs (requires env change + redeploy):
  - Lower `DISCOVERY_RPM`, `COMMENTS_RPM`, `HTTP_ENRICH_RPM` appropriately.
  - Redeploy web to apply changes.

- As a safety valve, temporarily activate Kill Switch if failures are cascading:

  ```bash
  curl -s -X POST "https://yourdomain.com/api/admin/kill-switch" \
    -H "Content-Type: application/json" \
    -d '{"reason":"Rate limit saturation","requestedBy":"oncall@company.com"}' | jq
  ```

### Verification

- Success rate returns to ≥ 70% on `/admin/jobs`.
- Error logs show reduced 429s within 5–10 minutes.
- Queue depths and in-progress job counts normalize.
- If Kill Switch was used, deactivate when stable:

```bash
curl -s -X DELETE "https://yourdomain.com/api/admin/kill-switch" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Resolved rate limit incident","requestedBy":"oncall@company.com"}' | jq
```

Escalation: If rate limits are provider-imposed (Upstash plan cap), coordinate with platform owners to upgrade or reconfigure.

---

## 2) MCP Failure (Bright Data MCP Unavailable/Errors)

### Detection

- Alerts for success rate < 70% or no successful discovery/harvesting for 30–60+ minutes.
- Error spikes in `/admin/logs` for MCP requests (timeouts, 5xx, connection errors).

Quick health snapshot:

```bash
curl -s "https://yourdomain.com/api/admin/jobs?hours=1" | jq '{successRate: .data.successRate, lastDiscovery: .data.lastDiscovery, lastHarvest: .data.lastHarvest}'
```

### Diagnosis

- Verify MCP endpoint health:
  - `MCP_BASE_URL` reachable from deployment.
  - API key validity: `BRIGHTDATA_MCP_API_KEY` (or `API_TOKEN`).
- Check provider status page or internal monitoring for outages.
- Determine blast radius: discovery only vs comments vs enrichment.

### Mitigation

- Avoid thrashing: Activate Kill Switch if failures are cascading broadly:

  ```bash
  curl -s -X POST "https://yourdomain.com/api/admin/kill-switch" \
    -H "Content-Type: application/json" \
    -d '{"reason":"MCP outage","requestedBy":"oncall@company.com"}' | jq
  ```

- Fallbacks/options:
  - Switch `MCP_BASE_URL` to a healthy region/backup and redeploy.
  - Reduce RPMs (`DISCOVERY_RPM`, `COMMENTS_RPM`) to lower upstream pressure.
  - Increase `MCP_STICKY_SESSION_MINUTES` to reduce churn if partial instability.

### Verification

- Successful jobs resume on `/admin/jobs`; last success times update.
- Error rate for MCP calls drops to background levels.
- Logs show normal completion events; DLQ stops growing.
- Deactivate Kill Switch when stable (see command above).

Escalation: Engage the MCP provider support with timestamps, error samples, and affected endpoints. Loop in the service owner for priority handling.

---

## 3) Dead Letter Queue (DLQ) Growth

### Detection

- Alert triggers at DLQ size ≥ 10.
- `/admin/jobs` shows DLQ size and failing job types.
- `/admin/dead-letter-queue` lists failed items.

### Diagnosis

- Inspect DLQ items for common error signatures (network, auth, validation):
  - Use filters and payload summary to spot patterns.
- Check `/admin/logs` around failure times for stack traces and correlation IDs.
- Validate recent changes (deploys, config, external dependencies).

### Mitigation

- Address root cause (config, secret, external outage). Then:
  - Retry targeted items from the UI or via API:

    ```bash
    curl -s -X POST "https://yourdomain.com/api/admin/dead-letter-queue" \
      -H "Content-Type: application/json" \
      -d '{"dlqId":"<uuid>","requestedBy":"oncall@company.com"}' | jq
    ```

  - For widespread transient failures, consider temporarily reducing concurrency or enabling Kill Switch to stop new failures.
  - Delete unrecoverable items with permanent errors after review:

    ```bash
    curl -s -X DELETE "https://yourdomain.com/api/admin/dead-letter-queue" \
      -H "Content-Type: application/json" \
      -d '{"dlqId":"<uuid>","requestedBy":"oncall@company.com"}' | jq
    ```

### Verification

- DLQ size trends downward and stabilizes < 10.
- Job success rate returns to ≥ 70% within the last hour.
- Recent executions complete without repeating the same error signature.

Escalation: If DLQ keeps growing after mitigations, page the service owner and database owner to investigate schema, constraints, and upstream data quality.

---

## References

- Admin UI: `/admin/jobs`, `/admin/kill-switch`, `/admin/dead-letter-queue`, `/admin/logs`
- Admin APIs: `/api/admin/jobs`, `/api/admin/kill-switch`, `/api/admin/dead-letter-queue`, `/api/admin/config`
- Key environment/config: `DISCOVERY_RPM`, `COMMENTS_RPM`, `HTTP_ENRICH_RPM`, `MCP_BASE_URL`, `BRIGHTDATA_MCP_API_KEY`, `MCP_STICKY_SESSION_MINUTES`
