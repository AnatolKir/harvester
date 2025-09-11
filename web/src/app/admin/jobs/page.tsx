import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TriggerDiscoveryClient from "./TriggerDiscovery";
import type { AdminJobsData, JobMetric } from "@/types/admin";

type RateLimitMetrics = {
  totalEvents: number;
  blockedRequests: number;
  abusePatterns: Array<{
    identifier: string;
    attempts: number;
    blockedAttempts: number;
    firstSeen: number;
    lastSeen: number;
  }>;
};

async function getJobsData(
  hours: number,
  type?: string,
  cookieHeader?: string
): Promise<AdminJobsData> {
  const qs = new URLSearchParams();
  qs.set("hours", String(hours));
  if (type) qs.set("type", type);
  const base = (
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3032"
  ).replace(/\/$/, "");
  const url = `${base}/api/admin/jobs?${qs.toString()}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  if (!res.ok) {
    throw new Error(`Failed to load jobs data (${res.status})`);
  }
  const json = await res.json();
  return json.data as AdminJobsData;
}

async function getRateLimitMetrics(
  cookieHeader?: string
): Promise<RateLimitMetrics | null> {
  const base = (
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3032"
  ).replace(/\/$/, "");
  const url = `${base}/api/metrics/rate-limits`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data as RateLimitMetrics;
}

function formatPercent(value: number) {
  if (Number.isNaN(value)) return "0%";
  return `${value.toFixed(2)}%`;
}

function formatMs(ms?: number | null) {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m ${rem}s`;
}

function computeOverallSuccess(jobMetrics: JobMetric[]) {
  const totals = jobMetrics.reduce(
    (acc, m) => {
      acc.total += Number(m.total_jobs || 0);
      acc.completed += Number(m.completed_jobs || 0);
      return acc;
    },
    { total: 0, completed: 0 }
  );
  if (totals.total === 0) return 0;
  return (totals.completed / totals.total) * 100;
}

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await createClient();
  const sp: Record<string, string | string[] | undefined> =
    (await searchParams) || {};
  const hoursRaw = sp["hours"];
  const typeRaw = sp["type"];
  const hoursParam = Array.isArray(hoursRaw) ? hoursRaw[0] : hoursRaw;
  const typeParam = Array.isArray(typeRaw) ? typeRaw[0] : typeRaw;
  const hours = Math.max(1, parseInt(hoursParam || "24", 10));
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const data = await getJobsData(hours, typeParam, cookieHeader);
  const rateMetrics = await getRateLimitMetrics(cookieHeader);

  const overallSuccess = computeOverallSuccess(data.jobMetrics || []);
  const lastSuccessfulRun = [
    data.systemHealth?.last_discovery_job,
    data.systemHealth?.last_harvesting_job,
  ]
    .filter(Boolean)
    .map((d) => new Date(String(d)).getTime())
    .reduce((a, b) => Math.max(a, b), 0);
  const lastSuccessfulRunDate = lastSuccessfulRun
    ? new Date(lastSuccessfulRun).toLocaleString()
    : "—";

  const inProgress = Number(data.systemHealth?.running_jobs || 0);
  const dlqSize = Number(data.systemHealth?.pending_dlq_items || 0);

  // Derived charts
  const jobsPerHour = (data.jobMetrics || []).map((m) => ({
    jobType: m.job_type,
    perHour: Number(m.total_jobs || 0) / hours || 0,
  }));
  const maxRate = jobsPerHour.length
    ? Math.max(...jobsPerHour.map((r) => r.perHour))
    : 0;

  const avgDurations = (data.jobMetrics || []).map((m) => ({
    jobType: m.job_type,
    avgMs: m.avg_execution_time_ms || 0,
  }));
  const maxAvg = avgDurations.length
    ? Math.max(...avgDurations.map((d) => d.avgMs))
    : 0;

  // manual trigger handled by client component

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin · Jobs</h1>
          <p className="text-muted-foreground">
            Execution metrics and recent activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin" className="text-sm underline">
            Health
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link href="/admin/kill-switch" className="text-sm underline">
            DLQ & Kill Switch
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">Range:</span>
        <div className="inline-flex rounded-md border">
          <Link
            href={`/admin/jobs?hours=24${typeParam ? `&type=${encodeURIComponent(typeParam)}` : ""}`}
            className={`px-3 py-1 text-sm ${hours === 24 ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            24h
          </Link>
          <Link
            href={`/admin/jobs?hours=168${typeParam ? `&type=${encodeURIComponent(typeParam)}` : ""}`}
            className={`px-3 py-1 text-sm ${hours === 168 ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            7d
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Success rate</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatPercent(overallSuccess)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Last successful run</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{lastSuccessfulRunDate}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>DLQ size</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {dlqSize}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>In-progress jobs</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {inProgress}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Jobs per hour</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {jobsPerHour.length === 0 && (
              <div className="text-muted-foreground text-sm">No data</div>
            )}
            {jobsPerHour.map((r) => (
              <div key={r.jobType} className="flex items-center gap-2">
                <div className="text-muted-foreground w-28 text-sm">
                  {r.jobType}
                </div>
                <div className="flex-1">
                  <div className="bg-muted h-3 rounded">
                    <div
                      className="bg-primary h-3 rounded"
                      style={{
                        width: `${maxRate ? Math.max(4, (r.perHour / maxRate) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="w-14 text-right text-sm tabular-nums">
                  {r.perHour.toFixed(2)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Duration (avg)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {avgDurations.length === 0 && (
              <div className="text-muted-foreground text-sm">No data</div>
            )}
            {avgDurations.map((d) => (
              <div key={d.jobType} className="flex items-center gap-2">
                <div className="text-muted-foreground w-28 text-sm">
                  {d.jobType}
                </div>
                <div className="flex-1">
                  <div className="bg-muted h-3 rounded">
                    <div
                      className="bg-secondary h-3 rounded"
                      style={{
                        width: `${maxAvg ? Math.max(4, (d.avgMs / maxAvg) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="w-24 text-right text-sm tabular-nums">
                  {formatMs(d.avgMs)}
                </div>
              </div>
            ))}
            <div className="text-muted-foreground pt-1 text-xs">
              p50/p95 pending backend support; showing averages.
            </div>
          </CardContent>
        </Card>
        {/* Rate limit metrics */}
        <Card>
          <CardHeader>
            <CardTitle>API Rate Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!rateMetrics && (
              <div className="text-muted-foreground text-sm">No data</div>
            )}
            {rateMetrics && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span>Total events</span>
                  <span className="tabular-nums">
                    {rateMetrics.totalEvents}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Blocked requests</span>
                  <span className="tabular-nums">
                    {rateMetrics.blockedRequests}
                  </span>
                </div>
                <div>
                  <div className="bg-muted h-3 rounded">
                    <div
                      className="bg-destructive h-3 rounded"
                      style={{
                        width: `${rateMetrics.totalEvents > 0 ? Math.min(100, (rateMetrics.blockedRequests / Math.max(1, rateMetrics.totalEvents)) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    Blocked ratio
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Top offenders</div>
                  {(rateMetrics.abusePatterns || []).slice(0, 5).map((p) => (
                    <div
                      key={p.identifier}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="truncate" title={p.identifier}>
                        {p.identifier}
                      </span>
                      <span className="tabular-nums">
                        {p.blockedAttempts}/{p.attempts}
                      </span>
                    </div>
                  ))}
                  {(rateMetrics.abusePatterns || []).length === 0 && (
                    <div className="text-muted-foreground text-xs">
                      No abuse patterns
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Manual discovery trigger */}
        <Card>
          <CardHeader>
            <CardTitle>Trigger discovery</CardTitle>
          </CardHeader>
          <CardContent>
            <TriggerDiscoveryClient />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent executions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {(data.recentLogs || []).slice(0, 20).map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between border-b py-1 last:border-0"
            >
              <span>
                {l.level?.toUpperCase()} · {l.event_type} · {l.message}
              </span>
              <span className="text-muted-foreground">
                {new Date(l.created_at).toLocaleString()}
              </span>
            </div>
          ))}
          {(!data.recentLogs || data.recentLogs.length === 0) && (
            <div className="text-muted-foreground">No recent logs</div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Link href="/admin">
          <Button variant="secondary" size="sm">
            Go to Health
          </Button>
        </Link>
        <Link href="/admin/kill-switch">
          <Button variant="outline" size="sm">
            Manage Kill Switch
          </Button>
        </Link>
      </div>
    </div>
  );
}
