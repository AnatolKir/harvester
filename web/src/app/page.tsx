import { Globe, MessageSquare, TrendingUp, AlertTriangle } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const [{ count: totalDomains }, pipelineStats, recentDomains] =
    await Promise.all([
      supabase
        .from("v_domains_overview")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("v_pipeline_stats")
        .select("domains_day, comments_day, errors_day")
        .returns<{
          domains_day: number;
          comments_day: number;
          errors_day: number;
        }>()
        .single(),
      supabase
        .from("v_domains_overview")
        .select("domain, total_mentions, first_seen, last_seen")
        .order("last_seen", { ascending: false })
        .limit(5)
        .returns<
          {
            domain: string;
            total_mentions: number;
            first_seen: string;
            last_seen: string;
          }[]
        >(),
    ]);

  const pipelineData = (
    pipelineStats as {
      data: {
        domains_day: number;
        comments_day: number;
        errors_day: number;
      } | null;
    }
  ).data;
  const domainsToday = pipelineData?.domains_day ?? 0;
  const commentsToday = pipelineData?.comments_day ?? 0;
  const errorsToday = pipelineData?.errors_day ?? 0;

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header with gradient */}
      <div className="from-primary/5 to-accent/5 glass relative overflow-hidden rounded-xl bg-gradient-to-br via-transparent p-8">
        <div className="relative z-10">
          <h1 className="gradient-text-subtle text-4xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Track domains discovered from TikTok comments and promoted content.
          </p>
        </div>
        <div className="bg-primary/5 absolute -top-20 -right-20 h-40 w-40 rounded-full blur-3xl" />
        <div className="bg-accent/5 absolute -bottom-10 -left-20 h-40 w-40 rounded-full blur-3xl" />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Domains"
          value={totalDomains || 0}
          description="Unique domains discovered"
          icon={<Globe className="text-muted-foreground h-4 w-4" />}
          trend={{
            value: 12,
            label: "from last month",
            isPositive: true,
          }}
        />
        <StatsCard
          title="New Today"
          value={domainsToday}
          description="Domains found today"
          icon={<TrendingUp className="text-muted-foreground h-4 w-4" />}
          trend={{
            value: 8,
            label: "from yesterday",
            isPositive: true,
          }}
        />
        <StatsCard
          title="Comments Analyzed"
          value={commentsToday}
          description="Comments processed"
          icon={<MessageSquare className="text-muted-foreground h-4 w-4" />}
        />
        <StatsCard
          title="Errors (Today)"
          value={errorsToday}
          description="Pipeline errors"
          icon={<AlertTriangle className="text-muted-foreground h-4 w-4" />}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-card card-hover glass-hover rounded-xl border p-6">
          <h3 className="mb-4 text-lg font-semibold">Recent Domains</h3>
          <div className="space-y-3">
            {(recentDomains.data || []).map((item, idx) => (
              <div
                key={item.domain}
                className="hover:bg-accent/50 animate-fade-in flex items-center justify-between rounded-lg p-3 transition-colors"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div>
                  <p className="font-medium">{item.domain}</p>
                  <p className="text-muted-foreground text-sm">
                    Last seen {new Date(item.last_seen).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="status-dot bg-chart-1" />
                  <span className="text-muted-foreground font-mono text-sm">
                    {item.total_mentions} mentions
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card card-hover glass-hover rounded-xl border p-6">
          <h3 className="mb-4 text-lg font-semibold">Processing Status</h3>
          <div className="space-y-4">
            <div className="from-chart-1/10 flex items-center justify-between rounded-lg bg-gradient-to-r to-transparent p-3">
              <span className="font-medium">Domains Today</span>
              <span className="text-foreground font-mono font-semibold">
                {domainsToday}
              </span>
            </div>
            <div className="from-chart-2/10 flex items-center justify-between rounded-lg bg-gradient-to-r to-transparent p-3">
              <span className="font-medium">Comments Today</span>
              <span className="text-foreground font-mono font-semibold">
                {commentsToday}
              </span>
            </div>
            <div className="from-destructive/10 flex items-center justify-between rounded-lg bg-gradient-to-r to-transparent p-3">
              <span className="font-medium">Errors Today</span>
              <span
                className={`font-mono font-semibold ${errorsToday > 0 ? "text-destructive" : "text-foreground"}`}
              >
                {errorsToday}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
