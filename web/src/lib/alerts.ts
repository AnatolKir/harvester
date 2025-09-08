type SlackPayload = {
  text: string;
  blocks?: any[];
};

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const ALERTS_DRY_RUN = process.env.ALERTS_DRY_RUN === "true";

// In-memory dedup cache (process-lifetime)
const sentCache = new Map<string, number>();

function shouldSend(key: string, windowMs: number): boolean {
  const now = Date.now();
  const prev = sentCache.get(key) || 0;
  if (now - prev < windowMs) return false;
  sentCache.set(key, now);
  return true;
}

export async function sendSlackAlert(title: string, message: string, dedupKey?: string, dedupWindowMs: number = 5 * 60 * 1000) {
  if (!SLACK_WEBHOOK_URL) return { delivered: false, reason: "no_webhook" };
  if (dedupKey && !shouldSend(dedupKey, dedupWindowMs)) {
    return { delivered: false, reason: "deduplicated" };
  }
  const payload: SlackPayload = {
    text: `${title}: ${message}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: title } },
      { type: "section", text: { type: "mrkdwn", text: message } },
    ],
  };

  if (ALERTS_DRY_RUN) {
    console.log("[alerts][dry-run] slack", payload);
    return { delivered: true, dryRun: true };
  }

  const res = await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { delivered: res.ok, status: res.status };
}

export async function alertKillSwitchChanged(active: boolean) {
  const title = active ? "Kill Switch ACTIVATED" : "Kill Switch DEACTIVATED";
  const message = active ? "All jobs halted by kill switch." : "Jobs may resume; kill switch off.";
  return sendSlackAlert(title, message, `killswitch:${active}`);
}

export async function alertJobError(jobId: string, context: Record<string, unknown> = {}) {
  const message = `Job failed: ${jobId}\nContext: \`${JSON.stringify(context).slice(0, 500)}\``;
  return sendSlackAlert("Job Error", message, `joberr:${jobId}`);
}


