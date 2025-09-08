import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

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
    systemHealth: any;
    jobMetrics: any[];
    activeJobs: any[];
    recentLogs: any[];
  };
}

async function trigger(action: string, body: Record<string, any> = {}) {
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
            <div>
              Kill Switch:{" "}
              {String(snapshot.systemHealth?.kill_switch_active ?? false)}
            </div>
            <div>Jobs 24h: {snapshot.systemHealth?.total_jobs_24h ?? 0}</div>
            <div>
              Completed 24h: {snapshot.systemHealth?.completed_jobs_24h ?? 0}
            </div>
            <div>Failed 24h: {snapshot.systemHealth?.failed_jobs_24h ?? 0}</div>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Jobs</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {(snapshot.activeJobs || [])
              .slice(0, 5)
              .map((j: any, i: number) => (
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
          {(snapshot.recentLogs || []).slice(0, 20).map((l: any) => (
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
