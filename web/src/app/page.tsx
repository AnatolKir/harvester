import { Globe, Video, MessageSquare, TrendingUp } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";

// Mock data - in real app this would come from API
const stats = {
  total_domains: 1247,
  domains_today: 43,
  domains_this_week: 298,
  total_videos: 5823,
  total_comments: 18429,
  total_mentions: 2156,
};

export default function Home() {
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
          value={stats.total_domains}
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
          value={stats.domains_today}
          description="Domains found today"
          icon={<TrendingUp className="text-muted-foreground h-4 w-4" />}
          trend={{
            value: 8,
            label: "from yesterday",
            isPositive: true,
          }}
        />
        <StatsCard
          title="Videos Processed"
          value={stats.total_videos}
          description="TikTok videos analyzed"
          icon={<Video className="text-muted-foreground h-4 w-4" />}
        />
        <StatsCard
          title="Comments Analyzed"
          value={stats.total_comments}
          description="Comments processed"
          icon={<MessageSquare className="text-muted-foreground h-4 w-4" />}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-card rounded-lg border p-6">
          <h3 className="mb-4 font-semibold">Recent Domains</h3>
          <div className="space-y-4">
            {[
              { domain: "shopify.com", mentions: 12, firstSeen: "2 hours ago" },
              { domain: "etsy.com", mentions: 8, firstSeen: "4 hours ago" },
              { domain: "amazon.com", mentions: 24, firstSeen: "6 hours ago" },
              {
                domain: "instagram.com",
                mentions: 15,
                firstSeen: "8 hours ago",
              },
            ].map((item) => (
              <div
                key={item.domain}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{item.domain}</p>
                  <p className="text-muted-foreground text-sm">
                    First seen {item.firstSeen}
                  </p>
                </div>
                <div className="text-muted-foreground text-sm">
                  {item.mentions} mentions
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <h3 className="mb-4 font-semibold">Processing Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Discovery Worker</span>
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Comment Harvester</span>
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Domain Extractor</span>
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Last Run</span>
              <span className="text-muted-foreground text-sm">
                3 minutes ago
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
