"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Server,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface HealthStatus {
  timestamp: string;
  overall: "healthy" | "degraded" | "unhealthy";
  components: {
    database: ComponentHealth;
    worker: ComponentHealth;
    jobs: ComponentHealth;
    redis?: ComponentHealth;
  };
  metrics?: {
    domainsLast24h: number;
    videosLast24h: number;
    lastJobExecution: string;
    activeJobs: number;
  };
}

interface ComponentHealth {
  status: "healthy" | "degraded" | "unhealthy";
  responseTime?: number;
  error?: string;
  details?: Record<string, unknown>;
}

interface SystemAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  sent_at: string;
  acknowledged: boolean;
}

export function MonitoringDashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchHealth = async () => {
    try {
      const response = await fetch("/api/health");
      const data = await response.json();
      setHealth(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch health status:", error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch("/api/monitoring/alerts");
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    }
  };

  const refreshData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchHealth(), fetchAlerts()]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "unhealthy":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "destructive" | "outline" | "secondary"
    > = {
      healthy: "default",
      degraded: "secondary",
      unhealthy: "destructive",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const formatResponseTime = (ms?: number) => {
    if (!ms) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Monitoring</h2>
          <p className="text-muted-foreground text-sm">
            Last updated: {formatTimeAgo(lastUpdate.toISOString())}
          </p>
        </div>
        <Button onClick={refreshData} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      {health && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(health.overall)}
                System Status
              </CardTitle>
              {getStatusBadge(health.overall)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Domains (24h)</p>
                <p className="text-2xl font-bold">
                  {health.metrics?.domainsLast24h || 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Videos (24h)</p>
                <p className="text-2xl font-bold">
                  {health.metrics?.videosLast24h || 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Active Jobs</p>
                <p className="text-2xl font-bold">
                  {health.metrics?.activeJobs || 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Last Job</p>
                <p className="text-sm font-medium">
                  {health.metrics?.lastJobExecution
                    ? formatTimeAgo(health.metrics.lastJobExecution)
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Component Health */}
      {health && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Database */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Database className="h-4 w-4" />
                Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getStatusBadge(
                  health.components.database?.status || "unknown"
                )}
                <p className="text-muted-foreground text-xs">
                  Response:{" "}
                  {formatResponseTime(health.components.database?.responseTime)}
                </p>
                {health.components.database?.error && (
                  <p className="text-xs text-red-500">
                    {health.components.database.error}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Worker */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Server className="h-4 w-4" />
                Worker
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getStatusBadge(health.components.worker?.status || "unknown")}
                <p className="text-muted-foreground text-xs">
                  Response:{" "}
                  {formatResponseTime(health.components.worker?.responseTime)}
                </p>
                {health.components.worker?.error && (
                  <p className="text-xs text-red-500">
                    {health.components.worker.error}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Jobs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getStatusBadge(health.components.jobs?.status || "unknown")}
                {health.components.jobs?.details && (
                  <div className="text-muted-foreground space-y-1 text-xs">
                    {(health.components.jobs.details as any).recentJobCount && (
                      <p>
                        Recent:{" "}
                        {(health.components.jobs.details as any).recentJobCount}
                      </p>
                    )}
                    {(health.components.jobs.details as any).failureRate && (
                      <p>
                        Failure:{" "}
                        {(health.components.jobs.details as any).failureRate}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Redis */}
          {health.components.redis && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Database className="h-4 w-4" />
                  Redis Cache
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getStatusBadge(health.components.redis.status)}
                  <p className="text-muted-foreground text-xs">
                    Response:{" "}
                    {formatResponseTime(health.components.redis.responseTime)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
          <CardDescription>
            System alerts from the last 24 hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent alerts</p>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <Alert
                  key={alert.id}
                  variant={
                    alert.severity === "critical" ? "destructive" : "default"
                  }
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    <span>{alert.title}</span>
                    <Badge
                      variant={alert.acknowledged ? "secondary" : "default"}
                    >
                      {alert.acknowledged ? "Acknowledged" : "New"}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription>
                    <p>{alert.message}</p>
                    <p className="mt-1 text-xs">
                      {formatTimeAgo(alert.sent_at)}
                    </p>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
