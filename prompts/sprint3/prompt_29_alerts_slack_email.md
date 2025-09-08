# Prompt 29: Alerts – Slack/Email for Key Events

## Role
You are an SRE adding lightweight alerting.

## Objective
Send Slack/email alerts on kill switch toggles, MCP failure spikes, and high abuse rate.

## Task
- Add a simple `alerts` module with providers (Slack webhook, SMTP or SendGrid).
- Trigger alerts from:
  - Kill switch on/off
  - MCP failure rate > threshold in window
  - Rate-limit abuse patterns over threshold

## Success Criteria
- [ ] Config via env; dry-run mode for dev.
- [ ] Alerts deduplicated within time window.
- [ ] Logged deliveries with status.

## Notes
Start minimal; one Slack webhook is enough for MVP.
