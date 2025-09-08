import sendSlackAlert from "./alerts/slack";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ALERTS_EMAIL_FROM = process.env.ALERTS_EMAIL_FROM;
const ALERTS_EMAIL_TO = process.env.ALERTS_EMAIL_TO;
const ALERTS_DRY_RUN = process.env.ALERTS_DRY_RUN === "true";

export async function sendEmailAlert(
  subject: string,
  message: string,
  dedupKey?: string,
  dedupWindowMs: number = 5 * 60 * 1000
) {
  if (!RESEND_API_KEY || !ALERTS_EMAIL_FROM || !ALERTS_EMAIL_TO) {
    return { delivered: false, reason: "email_not_configured" };
  }
  // simple per-process dedup for emails using the slack module cache
  // reusing the slack dedup is fine as process scope is the same in Next server
  const key = `email:${dedupKey || subject}`;
  const now = Date.now();
  const windowMs = dedupWindowMs;
  // lightweight dedup map without using any
  const g = globalThis as unknown as { __alertsDedup?: Map<string, number> };
  g.__alertsDedup = g.__alertsDedup || new Map<string, number>();
  const prev = g.__alertsDedup.get(key) || 0;
  if (now - prev < windowMs) {
    return { delivered: false, reason: "deduplicated" };
  }
  g.__alertsDedup.set(key, now);
  const payload = {
    from: ALERTS_EMAIL_FROM,
    to: [ALERTS_EMAIL_TO],
    subject,
    text: message,
  };
  if (ALERTS_DRY_RUN) {
    console.log("[alerts][dry-run] email", payload);
    return { delivered: true, dryRun: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  return { delivered: res.ok, status: res.status };
}

export async function alertKillSwitchChanged(active: boolean) {
  const title = active ? "Kill Switch ACTIVATED" : "Kill Switch DEACTIVATED";
  const message = active
    ? "All jobs halted by kill switch."
    : "Jobs may resume; kill switch off.";
  const dedup = `killswitch:${active}`;
  await sendSlackAlert(
    "kill_switch",
    { title, message, urlPath: "/admin" },
    { dedupKey: dedup }
  );
  await sendEmailAlert(title, message, dedup);
  return { ok: true };
}

export async function alertJobError(
  jobId: string,
  context: Record<string, unknown> = {}
) {
  const message = `Job failed: ${jobId}\nContext: \`${JSON.stringify(
    context
  ).slice(0, 500)}\``;
  const dedup = `joberr:${jobId}`;
  await sendSlackAlert(
    "generic",
    { title: "Job Error", message, urlPath: "/admin/logs", details: context },
    { dedupKey: dedup }
  );
  await sendEmailAlert("Job Error", message, dedup);
  return { ok: true };
}
