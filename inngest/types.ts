// TypeScript types for Inngest events and payloads

export interface VideoDiscoveryPayload {
  videoId?: string;
  forceRefresh?: boolean;
  limit?: number;
}

export interface DiscoveryBackfillPayload {
  days: number;
  limit?: number;
}

export interface CommentHarvestingPayload {
  videoId: string;
  maxPages?: number;
  delayBetweenPages?: number;
}

export interface DomainExtractionPayload {
  commentId: string;
  videoId: string;
  commentText: string;
}

export interface JobStatusPayload {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  metadata?: Record<string, any>;
}

export interface KillSwitchPayload {
  reason?: string;
  requestedBy?: string;
  timestamp?: string;
}

export interface RetryPayload {
  originalEventName: string;
  originalPayload: Record<string, any>;
  attempt: number;
  lastError?: string;
}

// Event types for Inngest
export type Events = {
  'tiktok/video.discovery.scheduled': {
    data: VideoDiscoveryPayload;
  };
  'tiktok/video.discovery.manual': {
    data: VideoDiscoveryPayload;
  };
  'tiktok/video.discovery.backfill': {
    data: DiscoveryBackfillPayload;
  };
  'tiktok/comment.harvest': {
    data: CommentHarvestingPayload;
  };
  'tiktok/domain.extract': {
    data: DomainExtractionPayload;
  };
  'tiktok/job.status.update': {
    data: JobStatusPayload;
  };
  'tiktok/system.kill_switch': {
    data: KillSwitchPayload;
  };
  'tiktok/system.deactivate_kill_switch': {
    data: KillSwitchPayload;
  };
  'tiktok/system.retry': {
    data: RetryPayload;
  };
  'tiktok/system.health_check': {
    data: {};
  };
  'tiktok/maintenance.cleanup': {
    data: {
      daysToKeep?: number;
    };
  };
};

// Job execution context
export interface JobContext {
  jobId: string;
  attempt: number;
  timestamp: Date;
  killSwitch: boolean;
}

// Response types
export interface JobResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

// Monitoring types
export interface JobMetrics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageExecutionTime: number;
  lastExecutionTime: Date;
}

export interface SystemHealth {
  killSwitchActive: boolean;
  discoveryJobsRunning: number;
  harvestingJobsRunning: number;
  deadLetterQueueSize: number;
  lastSuccessfulDiscovery?: Date;
  lastSuccessfulHarvest?: Date;
}
