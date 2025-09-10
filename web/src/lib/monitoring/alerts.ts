import { createAdminClient } from "@/lib/supabase/admin";

export type AlertSeverity = "info" | "warning" | "critical";

export interface AlertConfig {
  severity: AlertSeverity;
  title: string;
  message: string;
  details?: Record<string, unknown>;
  channel?: string;
}

interface SlackMessage {
  text: string;
  attachments?: Array<{
    color: string;
    title?: string;
    text?: string;
    fields?: Array<{
      title: string;
      value: string;
      short?: boolean;
    }>;
    footer?: string;
    ts?: number;
  }>;
}

// Rate limiting for alerts to prevent spam
const alertRateLimit = new Map<string, number>();
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const MAX_ALERTS_PER_WINDOW = 10;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  // Clean up old entries
  for (const [k, timestamp] of alertRateLimit.entries()) {
    if (timestamp < windowStart) {
      alertRateLimit.delete(k);
    }
  }

  // Count alerts in current window
  const alertsInWindow = Array.from(alertRateLimit.values()).filter(
    (t) => t >= windowStart
  ).length;

  if (alertsInWindow >= MAX_ALERTS_PER_WINDOW) {
    return false;
  }

  alertRateLimit.set(`${key}_${now}`, now);
  return true;
}

export async function sendSlackAlert(config: AlertConfig): Promise<void> {
  // Check if Slack alerts are enabled
  if (process.env.SLACK_ALERTS_ENABLED !== "true") {
    console.log("Slack alerts disabled, skipping:", config.title);
    return;
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("SLACK_WEBHOOK_URL not configured");
    return;
  }

  // Rate limit check
  if (!checkRateLimit(config.severity)) {
    console.warn("Alert rate limit exceeded for severity:", config.severity);
    return;
  }

  try {
    const color = {
      info: "#36a64f",
      warning: "#ff9900",
      critical: "#ff0000",
    }[config.severity];

    const emoji = {
      info: "ℹ️",
      warning: "⚠️",
      critical: "🚨",
    }[config.severity];

    const fields = config.details
      ? Object.entries(config.details).map(([title, value]) => ({
          title,
          value: String(value),
          short: true,
        }))
      : undefined;

    const message: SlackMessage = {
      text: `${emoji} *TikTok Harvester Alert*`,
      attachments: [
        {
          color,
          title: config.title,
          text: config.message,
          fields,
          footer: "TikTok Domain Harvester",
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error("Failed to send Slack alert:", response.statusText);
    }

    // Log alert to database for audit trail
    await logAlert(config);
  } catch (error) {
    console.error("Error sending Slack alert:", error);
  }
}

async function logAlert(config: AlertConfig): Promise<void> {
  try {
    const supabase = createAdminClient();

    await supabase.from("system_alerts").insert({
      severity: config.severity,
      title: config.title,
      message: config.message,
      details: config.details,
      sent_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to log alert to database:", error);
  }
}

// Monitoring functions that trigger alerts
export async function checkSystemHealth(): Promise<void> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/health`
    );
    const health = await response.json();

    if (health.overall === "unhealthy") {
      await sendSlackAlert({
        severity: "critical",
        title: "System Health Critical",
        message: "One or more system components are unhealthy",
        details: {
          database: health.components.database?.status,
          worker: health.components.worker?.status,
          jobs: health.components.jobs?.status,
        },
      });
    } else if (health.overall === "degraded") {
      await sendSlackAlert({
        severity: "warning",
        title: "System Health Degraded",
        message: "System performance is degraded",
        details: health.components,
      });
    }
  } catch (error) {
    await sendSlackAlert({
      severity: "critical",
      title: "Health Check Failed",
      message: "Unable to perform system health check",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

export async function checkDomainExtractionRate(): Promise<void> {
  try {
    const supabase = createAdminClient();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { count } = await supabase
      .from("domain")
      .select("*", { count: "exact", head: true })
      .gte("first_seen_at", twoHoursAgo);

    if (count === 0) {
      await sendSlackAlert({
        severity: "critical",
        title: "Domain Extraction Stopped",
        message: "No domains extracted in the last 2 hours",
        details: {
          lastCheckTime: new Date().toISOString(),
          expectedRate: "5+ domains/hour",
        },
      });
    } else if (count !== null && count < 10) {
      await sendSlackAlert({
        severity: "warning",
        title: "Low Domain Extraction Rate",
        message: `Only ${count} domains extracted in the last 2 hours`,
        details: {
          actualRate: `${(count / 2).toFixed(1)} domains/hour`,
          expectedRate: "5+ domains/hour",
        },
      });
    }
  } catch (error) {
    console.error("Failed to check domain extraction rate:", error);
  }
}

export async function checkJobExecution(): Promise<void> {
  try {
    const supabase = createAdminClient();
    const thirtyMinutesAgo = new Date(
      Date.now() - 30 * 60 * 1000
    ).toISOString();

    const { data: recentJobs, error } = await supabase
      .from("job_execution")
      .select("*")
      .gte("executed_at", thirtyMinutesAgo)
      .order("executed_at", { ascending: false });

    if (error) throw error;

    if (!recentJobs || recentJobs.length === 0) {
      await sendSlackAlert({
        severity: "critical",
        title: "Job Execution Stopped",
        message: "No jobs executed in the last 30 minutes",
        details: {
          lastCheckTime: new Date().toISOString(),
        },
      });
      return;
    }

    // Check failure rate
    const failedJobs = recentJobs.filter((job) => job.status === "failed");
    const failureRate = failedJobs.length / recentJobs.length;

    if (failureRate > 0.5) {
      await sendSlackAlert({
        severity: "critical",
        title: "High Job Failure Rate",
        message: `${(failureRate * 100).toFixed(0)}% of jobs are failing`,
        details: {
          totalJobs: recentJobs.length,
          failedJobs: failedJobs.length,
          recentFailures: failedJobs.slice(0, 3).map((j) => j.job_type),
        },
      });
    } else if (failureRate > 0.2) {
      await sendSlackAlert({
        severity: "warning",
        title: "Elevated Job Failure Rate",
        message: `${(failureRate * 100).toFixed(0)}% of jobs are failing`,
        details: {
          totalJobs: recentJobs.length,
          failedJobs: failedJobs.length,
        },
      });
    }
  } catch (error) {
    console.error("Failed to check job execution:", error);
  }
}

export async function checkWorkerHealth(): Promise<void> {
  try {
    const workerUrl = process.env.WORKER_URL || "http://localhost:3001";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${workerUrl}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      await sendSlackAlert({
        severity: "critical",
        title: "Worker Unhealthy",
        message: `Worker health check returned status ${response.status}`,
        details: {
          workerUrl,
          status: response.status,
          timestamp: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    await sendSlackAlert({
      severity: "critical",
      title: "Worker Unreachable",
      message: "Cannot connect to worker service",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
        workerUrl: process.env.WORKER_URL || "http://localhost:3001",
      },
    });
  }
}

// Alert on specific events
export async function alertOnVideoDiscovery(count: number): Promise<void> {
  if (count > 100) {
    await sendSlackAlert({
      severity: "info",
      title: "High Video Discovery Rate",
      message: `Discovered ${count} new videos in the last hour`,
      details: {
        count,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

export async function alertOnDomainMilestone(
  totalDomains: number
): Promise<void> {
  const milestones = [100, 500, 1000, 5000, 10000];
  if (milestones.includes(totalDomains)) {
    await sendSlackAlert({
      severity: "info",
      title: "Domain Milestone Reached! 🎉",
      message: `The system has discovered ${totalDomains} unique domains`,
      details: {
        totalDomains,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// Weekly summary alert
export async function sendWeeklySummary(): Promise<void> {
  try {
    const supabase = createAdminClient();
    const oneWeekAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Get weekly stats
    const { count: domainCount } = await supabase
      .from("domain")
      .select("*", { count: "exact", head: true })
      .gte("first_seen_at", oneWeekAgo);

    const { count: videoCount } = await supabase
      .from("video")
      .select("*", { count: "exact", head: true })
      .gte("discovered_at", oneWeekAgo);

    const { count: commentCount } = await supabase
      .from("comment")
      .select("*", { count: "exact", head: true })
      .gte("fetched_at", oneWeekAgo);

    await sendSlackAlert({
      severity: "info",
      title: "Weekly System Summary 📊",
      message: "Here's what the harvester accomplished this week",
      details: {
        "New Domains": domainCount || 0,
        "Videos Processed": videoCount || 0,
        "Comments Analyzed": commentCount || 0,
        "Avg Domains/Day": Math.round((domainCount || 0) / 7),
      },
    });
  } catch (error) {
    console.error("Failed to generate weekly summary:", error);
  }
}
