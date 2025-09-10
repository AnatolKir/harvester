# Slack Alerts Configuration

## Overview
The TikTok Domain Harvester integrates with Slack to send real-time alerts for important system events.

## Setup Instructions

### 1. Create Slack Incoming Webhook

1. Go to your Slack workspace
2. Navigate to **Apps** → **Incoming Webhooks**
3. Click **Add to Slack**
4. Choose the channel for alerts (e.g., `#tiktok-alerts`)
5. Copy the webhook URL

### 2. Configure Environment Variables

Add to your `.env.local` or Vercel environment variables:

```bash
# Slack Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_ALERTS_ENABLED=true
ALERTS_DRY_RUN=false  # Set to true for testing without sending
```

### 3. Alert Types

The system sends Slack alerts for:

- **Kill Switch Changes**: When harvesting is paused/resumed
- **Job Failures**: When Inngest jobs fail
- **User Access Requests**: New user registration attempts
- **Critical Errors**: System-level failures
- **Rate Limit Issues**: When hitting API limits

### 4. Alert Format

Alerts include:
- **Title**: Clear description of the event
- **Severity**: Info, Warning, or Error
- **Timestamp**: When the event occurred
- **Details**: Relevant context and data
- **Action Required**: If manual intervention needed

### 5. Testing Alerts

Test your Slack integration:

```javascript
// Test via API endpoint
POST /api/admin/test-alert
{
  "message": "Test alert from TikTok Harvester"
}
```

### 6. Alert Deduplication

- Alerts are deduplicated within 5-minute windows
- Prevents spam during repeated failures
- Each unique alert type has its own dedup key

### 7. Customization

Modify alert behavior in `/src/lib/alerts/slack.ts`:
- Change dedup window
- Customize message formatting
- Add new alert types
- Modify severity levels

### 8. Troubleshooting

**Not receiving alerts?**
- Verify `SLACK_ALERTS_ENABLED=true`
- Check webhook URL is correct
- Ensure `ALERTS_DRY_RUN=false` for production
- Check Slack channel permissions

**Too many alerts?**
- Increase dedup window
- Filter by severity
- Use separate channels for different alert types

### 9. Best Practices

- Use dedicated channel for alerts
- Set up notification preferences in Slack
- Review alerts daily
- Archive resolved issues
- Keep webhook URL secure (never commit to git)

## Alert Examples

### Kill Switch Activated
```
🚨 Kill Switch ACTIVATED
Harvesting has been paused
Reason: Manual intervention
Time: 2025-01-10 15:30:00
Action: Check /admin/kill-switch to resume
```

### New User Request
```
👤 New User Access Request
Email: newuser@example.com
Name: John Doe
Time: 2025-01-10 15:30:00
Action: Review at /admin/users
```

### Job Failure
```
❌ Job Failed: comment_harvesting
Error: Rate limit exceeded
Video: tiktok.com/@user/video/123
Retry: Automatic in 5 minutes
```

## Security Notes

- Never share webhook URLs publicly
- Rotate webhooks if compromised
- Use environment variables only
- Limit channel access to team members

---
*For more details, see `/src/lib/alerts/slack.ts`*