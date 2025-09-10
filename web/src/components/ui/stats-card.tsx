import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

export interface StatsCardProps {
  title: string;
  value: number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
}: StatsCardProps) {
  return (
    <Card className="card-hover border-border/50 glass-hover relative overflow-hidden">
      <div className="from-primary/5 absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-50" />
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="bg-accent/50 rounded-lg p-2">{icon}</div>
      </CardHeader>
      <CardContent className="relative">
        <div className="animate-fade-in text-3xl font-bold tracking-tight">
          {formatNumber(value)}
        </div>
        {description && (
          <CardDescription className="text-muted-foreground mt-1 text-xs">
            {description}
          </CardDescription>
        )}
        {trend && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            <span
              className={`rounded-full px-2 py-0.5 font-semibold ${
                trend.isPositive
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              {trend.isPositive ? "↑" : "↓"}
              {trend.value}%
            </span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
