import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type SystemHealthSnapshot = Record<string, unknown>;
type JobMetric = Record<string, unknown>;
type ActiveJob = { job_type: string; status: string; job_count: number };
type SystemLog = {
  id: string;
  level: string;
  event_type: string;
  message: string;
  created_at: string;
};

async function getAdminSnapshot() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/admin/jobs`,
    {
      cache: "no-store",
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to load admin snapshot (${res.status})`);
  }
  const json = await res.json();
  return json.data as {
    systemHealth: SystemHealthSnapshot;
    jobMetrics: JobMetric[];
    activeJobs: ActiveJob[];
    recentLogs: SystemLog[];
  };
}

async function trigger(action: string, body: Record<string, unknown> = {}) {
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/admin/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
}

export default async function AdminPage() {
  // Ensure user session is refreshed server-side
  await createClient();
  const snapshot = await getAdminSnapshot();

  // Coerce unknowns from snapshot to safe primitives for rendering
  const sys = (snapshot.systemHealth || {}) as Record<string, unknown>;
  const killSwitchActive = Boolean(sys["kill_switch_active"]);
  const jobs24h = Number((sys["total_jobs_24h"] as number | undefined) ?? 0);
  const completed24h = Number(
    (sys["completed_jobs_24h"] as number | undefined) ?? 0
  );
  const failed24h = Number((sys["failed_jobs_24h"] as number | undefined) ?? 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin · Inngest</h1>
        <p className="text-muted-foreground">
          Monitor jobs and trigger maintenance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Kill Switch: {String(killSwitchActive)}</div>
            <div>Jobs 24h: {jobs24h}</div>
            <div>Completed 24h: {completed24h}</div>
            <div>Failed 24h: {failed24h}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <form
              action={async () => {
                "use server";
                await trigger("trigger_discovery", {
                  limit: 25,
                  forceRefresh: false,
                });
              }}
            >
              <Button type="submit" size="sm">
                Trigger Discovery
              </Button>
            </form>
            <form
              action={async () => {
                "use server";
                await trigger("trigger_health_check");
              }}
            >
              <Button type="submit" variant="secondary" size="sm">
                Health Check
              </Button>
            </form>
            <form
              action={async () => {
                "use server";
                await trigger("trigger_maintenance", { daysToKeep: 90 });
              }}
            >
              <Button type="submit" variant="outline" size="sm">
                Maintenance
              </Button>
            </form>
            <form
              action={async () => {
                "use server";
                await trigger("trigger_backfill", { days: 7, limit: 100 });
              }}
            >
              <Button type="submit" variant="secondary" size="sm">
                Backfill (7 days)
              </Button>
            </form>
            {/* CSV Exports */}
            <Button asChild size="sm" variant="outline">
              <a
                href={`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/domains/export?dateFilter=all`}
                target="_blank"
                rel="noreferrer"
              >
                Export Domains CSV (All)
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a
                href={`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/domains/export?dateFilter=week`}
                target="_blank"
                rel="noreferrer"
              >
                Export Domains CSV (Week)
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a
                href={`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/domains/export?dateFilter=today`}
                target="_blank"
                rel="noreferrer"
              >
                Export Domains CSV (Today)
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Jobs</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {(snapshot.activeJobs || [])
              .slice(0, 5)
              .map((j: ActiveJob, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b py-1 last:border-0"
                >
                  <span>
                    {j.job_type} · {j.status}
                  </span>
                  <span className="text-muted-foreground">{j.job_count}</span>
                </div>
              ))}
            {(!snapshot.activeJobs || snapshot.activeJobs.length === 0) && (
              <div className="text-muted-foreground">No active jobs</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {(snapshot.recentLogs || []).slice(0, 20).map((l: SystemLog) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
