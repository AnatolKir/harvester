export interface SystemHealth {
  kill_switch_active: boolean;
  total_jobs_24h: number;
  completed_jobs_24h: number;
  failed_jobs_24h: number;
  running_jobs: number;
  pending_dlq_items: number;
  last_discovery_job: string | null;
  last_harvesting_job: string | null;
  system_load_score: number;
}

export interface JobMetric {
  job_type: string;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  avg_execution_time_ms: number | null;
  success_rate: number;
  last_job_at: string | null;
}

export interface ActiveJobSummary {
  job_type: string;
  status: "running" | "pending" | string;
  job_count: number;
  oldest_job_started: string | null;
  newest_job_started: string | null;
  avg_runtime_seconds: number | null;
}

export interface SystemLog {
  id: string;
  event_type: string;
  level: "debug" | "info" | "warn" | "error" | string;
  message: string;
  job_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminJobsData {
  systemHealth: SystemHealth;
  jobMetrics: JobMetric[];
  activeJobs: ActiveJobSummary[];
  recentLogs: SystemLog[];
}
