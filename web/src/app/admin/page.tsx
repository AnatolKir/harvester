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
    <div className="animate-fade-in space-y-8">
      <div className="from-primary/5 to-accent/5 glass relative overflow-hidden rounded-xl bg-gradient-to-br via-transparent p-8">
        <div className="relative z-10">
          <h1 className="gradient-text-subtle text-4xl font-bold tracking-tight">
            Admin · Inngest
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor jobs and trigger maintenance.
          </p>
        </div>
        <div className="bg-primary/5 absolute -top-20 -right-20 h-40 w-40 rounded-full blur-3xl" />
        <div className="bg-accent/5 absolute -bottom-10 -left-20 h-40 w-40 rounded-full blur-3xl" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-hover border-border/50 glass-hover relative overflow-hidden">
          <div className="from-chart-1/10 absolute inset-0 bg-gradient-to-br to-transparent" />
          <CardHeader className="relative">
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-2 text-sm">
            <div className="bg-muted/50 flex justify-between rounded-lg p-2">
              <span>Kill Switch:</span>
              <span
                className={`font-mono font-semibold ${killSwitchActive ? "text-destructive" : "text-green-600"}`}
              >
                {String(killSwitchActive)}
              </span>
            </div>
            <div className="hover:bg-muted/50 flex justify-between rounded-lg p-2 transition-colors">
              <span>Jobs 24h:</span>
              <span className="font-mono font-semibold">{jobs24h}</span>
            </div>
            <div className="hover:bg-muted/50 flex justify-between rounded-lg p-2 transition-colors">
              <span>Completed 24h:</span>
              <span className="font-mono font-semibold text-green-600">
                {completed24h}
              </span>
            </div>
            <div className="hover:bg-muted/50 flex justify-between rounded-lg p-2 transition-colors">
              <span>Failed 24h:</span>
              <span
                className={`font-mono font-semibold ${failed24h > 0 ? "text-destructive" : "text-muted-foreground"}`}
              >
                {failed24h}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-border/50 glass-hover relative overflow-hidden">
          <div className="from-chart-2/10 absolute inset-0 bg-gradient-to-br to-transparent" />
          <CardHeader className="relative">
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

        <Card className="card-hover border-border/50 glass-hover relative overflow-hidden">
          <div className="from-chart-3/10 absolute inset-0 bg-gradient-to-br to-transparent" />
          <CardHeader className="relative">
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

      <Card className="card-hover border-border/50 glass-hover relative overflow-hidden">
        <div className="from-primary/5 absolute inset-0 bg-gradient-to-br via-transparent to-transparent" />
        <CardHeader className="relative">
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
