type SlackBlock = { type: string; [key: string]: unknown };

export type SlackAlertType =
  | "kill_switch"
  | "discovery_gap"
  | "harvest_gap"
  | "low_success_rate"
  | "dlq_backlog"
  | "generic";

export interface SlackAlertPayload {
  title?: string;
  message?: string;
  details?: Record<string, unknown>;
  urlPath?: string; // e.g. "/admin" or "/admin/logs"
}

const sentCache = new Map<string, number>();

function shouldSendDedup(key: string, windowMs: number): boolean {
  const now = Date.now();
  const prev = sentCache.get(key) || 0;
  if (now - prev < windowMs) return false;
  sentCache.set(key, now);
  return true;
}

function getBaseUrl(): string | undefined {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL;
}

function defaultTitleFor(type: SlackAlertType): string {
  switch (type) {
    case "kill_switch":
      return "Kill Switch Activated";
    case "discovery_gap":
      return "Discovery Pipeline Gap";
    case "harvest_gap":
      return "Harvesting Pipeline Gap";
    case "low_success_rate":
      return "Low Job Success Rate";
    case "dlq_backlog":
      return "Dead Letter Queue Backlog";
    default:
      return "System Alert";
  }
}

import { createClient } from "@supabase/supabase-js";

let alertsEnabledCache: { value: boolean; fetchedAt: number } | null = null;
const ALERTS_CACHE_TTL_MS = 60_000; // 1 minute

async function getAlertsEnabled(): Promise<boolean> {
  const now = Date.now();
  if (
    alertsEnabledCache &&
    now - alertsEnabledCache.fetchedAt < ALERTS_CACHE_TTL_MS
  ) {
    return alertsEnabledCache.value;
  }

  const envFallback = process.env.SLACK_ALERTS_ENABLED === "true";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    alertsEnabledCache = { value: envFallback, fetchedAt: now };
    return envFallback;
  }

  try {
    const supabase = createClient(url, key);
    const { data } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "alerts_enabled")
      .maybeSingle();
    const enabled = (data?.value as boolean | undefined) ?? envFallback;
    alertsEnabledCache = { value: enabled, fetchedAt: now };
    return enabled;
  } catch {
    alertsEnabledCache = { value: envFallback, fetchedAt: now };
    return envFallback;
  }
}

export async function sendSlackAlert(
  type: SlackAlertType,
  payload: SlackAlertPayload,
  options: { dedupKey?: string; dedupWindowMs?: number; retries?: number } = {}
): Promise<{
  delivered: boolean;
  status?: number;
  dryRun?: boolean;
  reason?: string;
}> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const alertsEnabled = await getAlertsEnabled();
  const dryRun = process.env.ALERTS_DRY_RUN === "true";

  if (!alertsEnabled) return { delivered: false, reason: "disabled" };
  if (!webhookUrl) return { delivered: false, reason: "no_webhook" };

  const dedupKey = options.dedupKey;
  const dedupWindowMs = options.dedupWindowMs ?? 5 * 60 * 1000;
  if (dedupKey && !shouldSendDedup(dedupKey, dedupWindowMs)) {
    return { delivered: false, reason: "deduplicated" };
  }

  const title = payload.title || defaultTitleFor(type);
  const baseUrl = getBaseUrl();
  const link = baseUrl ? `${baseUrl}${payload.urlPath || "/admin"}` : undefined;

  const blocks: SlackBlock[] = [
    { type: "header", text: { type: "plain_text", text: title } },
  ];

  const message = payload.message || "Attention required.";
  blocks.push({ type: "section", text: { type: "mrkdwn", text: message } });

  if (payload.details) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "```" +
          JSON.stringify(payload.details, null, 2).slice(0, 3000) +
          "```",
      },
    });
  }

  if (link) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Open Admin" },
          url: link,
        },
      ],
    });
  }

  const body = JSON.stringify({
    text: `${title}: ${message}`,
    blocks,
  });

  if (dryRun) {
    console.log("[alerts][dry-run] slack", { type, payload });
    return { delivered: true, dryRun: true };
  }

  const maxRetries = Math.max(0, Math.min(5, options.retries ?? 2));
  let lastStatus: number | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      lastStatus = res.status;
      if (res.ok) return { delivered: true, status: res.status };
    } catch (err) {
      // swallow error and retry
    }
    if (attempt < maxRetries) {
      const backoffMs = 500 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  return { delivered: false, status: lastStatus };
}

export default sendSlackAlert;
