import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface HealthCheckComponent {
  status: "healthy" | "degraded" | "unhealthy";
  responseTime?: number;
  error?: string;
  details?: Record<string, unknown>;
}

interface HealthCheckResponse {
  timestamp: string;
  overall: "healthy" | "degraded" | "unhealthy";
  components: {
    database: HealthCheckComponent;
    worker: HealthCheckComponent;
    jobs: HealthCheckComponent;
    redis?: HealthCheckComponent;
  };
  metrics?: {
    domainsLast24h?: number;
    videosLast24h?: number;
    lastJobExecution?: string;
    activeJobs?: number;
  };
}

async function checkDatabase(): Promise<HealthCheckComponent> {
  const startTime = Date.now();
  try {
    const supabase = createAdminClient();

    // Test database connectivity with a simple query
    const { error } = await supabase.from("domain").select("id").limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        status: "unhealthy",
        responseTime,
        error: error.message,
      };
    }

    // Check if response time is acceptable
    if (responseTime > 5000) {
      return {
        status: "degraded",
        responseTime,
        details: { message: "Database response time is high" },
      };
    }

    return {
      status: "healthy",
      responseTime,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

async function checkWorker(): Promise<HealthCheckComponent> {
  const startTime = Date.now();
  try {
    // Check worker health endpoint
    const workerUrl = process.env.WORKER_URL || "http://localhost:3001";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${workerUrl}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        status: "unhealthy",
        responseTime,
        error: `Worker returned status ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      status: "healthy",
      responseTime,
      details: data,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Worker unreachable",
    };
  }
}

async function checkJobs(): Promise<HealthCheckComponent> {
  const startTime = Date.now();
  try {
    const supabase = createAdminClient();

    // Check recent job executions
    const thirtyMinutesAgo = new Date(
      Date.now() - 30 * 60 * 1000
    ).toISOString();

    const { data: recentJobs, error } = await supabase
      .from("job_execution")
      .select("id, job_type, status, executed_at")
      .gte("executed_at", thirtyMinutesAgo)
      .order("executed_at", { ascending: false })
      .limit(10);

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        status: "unhealthy",
        responseTime,
        error: error.message,
      };
    }

    // Check if any jobs have run recently
    if (!recentJobs || recentJobs.length === 0) {
      return {
        status: "degraded",
        responseTime,
        details: {
          message: "No jobs executed in the last 30 minutes",
          lastJobTime: null,
        },
      };
    }

    // Check for failed jobs
    const failedJobs = recentJobs.filter((job) => job.status === "failed");
    if (failedJobs.length > recentJobs.length * 0.5) {
      return {
        status: "degraded",
        responseTime,
        details: {
          message: "High job failure rate",
          failureRate: `${((failedJobs.length / recentJobs.length) * 100).toFixed(0)}%`,
          recentJobs: recentJobs.slice(0, 5),
        },
      };
    }

    return {
      status: "healthy",
      responseTime,
      details: {
        recentJobCount: recentJobs.length,
        lastJobTime: recentJobs[0]?.executed_at,
        failureRate: `${((failedJobs.length / recentJobs.length) * 100).toFixed(0)}%`,
      },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      responseTime: Date.now() - startTime,
      error:
        error instanceof Error ? error.message : "Unable to check job status",
    };
  }
}

async function checkRedis(): Promise<HealthCheckComponent | undefined> {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return undefined;
  }

  const startTime = Date.now();
  try {
    const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      },
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        status: "unhealthy",
        responseTime,
        error: `Redis returned status ${response.status}`,
      };
    }

    return {
      status: "healthy",
      responseTime,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Redis unreachable",
    };
  }
}

async function getMetrics() {
  try {
    const supabase = createAdminClient();
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    // Get domain count for last 24 hours
    const { count: domainCount } = await supabase
      .from("domain")
      .select("*", { count: "exact", head: true })
      .gte("first_seen_at", twentyFourHoursAgo);

    // Get video count for last 24 hours
    const { count: videoCount } = await supabase
      .from("video")
      .select("*", { count: "exact", head: true })
      .gte("discovered_at", twentyFourHoursAgo);

    // Get last job execution
    const { data: lastJob } = await supabase
      .from("job_execution")
      .select("executed_at, job_type")
      .order("executed_at", { ascending: false })
      .limit(1)
      .single();

    // Get active job count
    const { count: activeJobs } = await supabase
      .from("job_execution")
      .select("*", { count: "exact", head: true })
      .eq("status", "running");

    return {
      domainsLast24h: domainCount || 0,
      videosLast24h: videoCount || 0,
      lastJobExecution: lastJob?.executed_at,
      activeJobs: activeJobs || 0,
    };
  } catch (error) {
    console.error("Failed to get metrics:", error);
    return undefined;
  }
}

export async function GET() {
  try {
    // Run all health checks in parallel
    const [database, worker, jobs, redis, metrics] = await Promise.all([
      checkDatabase(),
      checkWorker(),
      checkJobs(),
      checkRedis(),
      getMetrics(),
    ]);

    // Determine overall health status
    const components = { database, worker, jobs };
    if (redis) {
      components.redis = redis;
    }

    const statuses = Object.values(components).map((c) => c.status);
    let overall: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (statuses.includes("unhealthy")) {
      overall = "unhealthy";
    } else if (statuses.includes("degraded")) {
      overall = "degraded";
    }

    const response: HealthCheckResponse = {
      timestamp: new Date().toISOString(),
      overall,
      components,
      metrics,
    };

    // Set appropriate status code based on health
    const statusCode =
      overall === "healthy" ? 200 : overall === "degraded" ? 200 : 503;

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        overall: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
