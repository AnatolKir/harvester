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
        .limit(5),
    ]);

  const domainsToday = pipelineStats.data?.domains_day ?? 0;
  const commentsToday = pipelineStats.data?.comments_day ?? 0;
  const errorsToday = pipelineStats.data?.errors_day ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Track domains discovered from TikTok comments and promoted content.
        </p>
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
        <div className="bg-card rounded-lg border p-6">
          <h3 className="mb-4 font-semibold">Recent Domains</h3>
          <div className="space-y-4">
            {(recentDomains.data || []).map((item) => (
              <div
                key={item.domain}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{item.domain}</p>
                  <p className="text-muted-foreground text-sm">
                    Last seen {new Date(item.last_seen).toLocaleString()}
                  </p>
                </div>
                <div className="text-muted-foreground text-sm">
                  {item.total_mentions} mentions
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <h3 className="mb-4 font-semibold">Processing Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Domains Today</span>
              <span className="text-muted-foreground text-sm">
                {domainsToday}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Comments Today</span>
              <span className="text-muted-foreground text-sm">
                {commentsToday}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Errors Today</span>
              <span className="text-muted-foreground text-sm">
                {errorsToday}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
