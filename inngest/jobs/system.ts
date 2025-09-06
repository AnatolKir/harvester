import { inngest } from "../client";
import { Events, JobResult, KillSwitchPayload, SystemHealth } from "../types";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Kill switch job - stops all running jobs
export const killSwitchJob = inngest.createFunction(
  {
    id: "system-kill-switch",
    name: "System Kill Switch",
    retries: 0, // Don't retry kill switch operations
  },
  { event: "tiktok/system.kill_switch" },
  async ({ event, step, logger }) => {
    const { reason, requestedBy, timestamp } = event.data;

    logger.warn("Kill switch activated", {
      reason,
      requestedBy,
      timestamp,
    });

    try {
      // Step 1: Activate kill switch in database
      await step.run("activate-kill-switch", async () => {
        // First ensure the system_config table exists and has the kill switch record
        const { data: existingConfig } = await supabase
          .from("system_config")
          .select("key")
          .eq("key", "kill_switch_active")
          .maybeSingle();

        if (!existingConfig) {
          // Create the kill switch config if it doesn't exist
          await supabase
            .from("system_config")
            .insert({
              key: "kill_switch_active",
              value: true,
              description: "Emergency kill switch for all jobs"
            });
        } else {
          // Update existing config
          await supabase
            .from("system_config")
            .update({
              value: true,
              updated_at: new Date().toISOString()
            })
            .eq("key", "kill_switch_active");
        }

        logger.info("Kill switch activated in database");
      });

      // Step 2: Log the kill switch activation
      await step.run("log-kill-switch", async () => {
        await supabase
          .from("system_logs")
          .insert({
            event_type: "kill_switch_activated",
            message: `Kill switch activated: ${reason || 'No reason provided'}`,
            metadata: {
              requestedBy,
              timestamp,
              reason
            }
          });
      });

      // Step 3: Cancel all pending scheduled jobs (if supported by Inngest)
      await step.run("cancel-pending-jobs", async () => {
        // Note: This would require Inngest API integration for canceling jobs
        // For now, we rely on the kill switch check in each job
        logger.info("Kill switch will prevent new jobs from executing");
      });

      return {
        success: true,
        data: {
          killSwitchActivated: true,
          activationTime: new Date().toISOString()
        },
        metadata: {
          reason,
          requestedBy
        }
      } as JobResult;

    } catch (error) {
      logger.error("Failed to activate kill switch", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      throw error;
    }
  }
);

// Job to deactivate kill switch
export const deactivateKillSwitchJob = inngest.createFunction(
  {
    id: "system-deactivate-kill-switch",
    name: "Deactivate System Kill Switch",
    retries: 0,
  },
  { event: "tiktok/system.deactivate_kill_switch" },
  async ({ event, step, logger }) => {
    const { reason, requestedBy } = event.data;

    logger.info("Deactivating kill switch", {
      reason,
      requestedBy,
    });

    try {
      await step.run("deactivate-kill-switch", async () => {
        await supabase
          .from("system_config")
          .update({
            value: false,
            updated_at: new Date().toISOString()
          })
          .eq("key", "kill_switch_active");

        await supabase
          .from("system_logs")
          .insert({
            event_type: "kill_switch_deactivated",
            message: `Kill switch deactivated: ${reason || 'No reason provided'}`,
            metadata: {
              requestedBy,
              reason
            }
          });

        logger.info("Kill switch deactivated");
      });

      return {
        success: true,
        data: {
          killSwitchDeactivated: true,
          deactivationTime: new Date().toISOString()
        }
      } as JobResult;

    } catch (error) {
      logger.error("Failed to deactivate kill switch", { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
);

// Health check job
export const healthCheckJob = inngest.createFunction(
  {
    id: "system-health-check",
    name: "System Health Check",
    retries: 1,
  },
  [
    { event: "tiktok/system.health_check" },
    { cron: "*/5 * * * *" } // Every 5 minutes
  ],
  async ({ event, step, logger }) => {
    logger.info("Starting system health check");

    try {
      const healthData = await step.run("collect-health-metrics", async () => {
        // Check kill switch status
        const { data: killSwitchConfig } = await supabase
          .from("system_config")
          .select("value")
          .eq("key", "kill_switch_active")
          .maybeSingle();

        const killSwitchActive = killSwitchConfig?.value === true;

        // Get recent job statistics
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const { data: recentJobs } = await supabase
          .from("job_status")
          .select("status, created_at")
          .gte("created_at", oneDayAgo);

        // Get discovery job statistics
        const { data: recentDiscovery } = await supabase
          .from("video")
          .select("discovered_at")
          .gte("discovered_at", oneDayAgo)
          .order("discovered_at", { ascending: false })
          .limit(1);

        // Get harvesting job statistics  
        const { data: recentHarvest } = await supabase
          .from("comment")
          .select("discovered_at")
          .gte("discovered_at", oneDayAgo)
          .order("discovered_at", { ascending: false })
          .limit(1);

        // Calculate metrics
        const totalJobs = recentJobs?.length || 0;
        const completedJobs = recentJobs?.filter(job => job.status === 'completed').length || 0;
        const failedJobs = recentJobs?.filter(job => job.status === 'failed').length || 0;
        const runningJobs = recentJobs?.filter(job => job.status === 'running').length || 0;

        const lastSuccessfulDiscovery = recentDiscovery?.[0]?.discovered_at 
          ? new Date(recentDiscovery[0].discovered_at) 
          : undefined;

        const lastSuccessfulHarvest = recentHarvest?.[0]?.discovered_at 
          ? new Date(recentHarvest[0].discovered_at) 
          : undefined;

        return {
          killSwitchActive,
          discoveryJobsRunning: runningJobs, // Simplified for MVP
          harvestingJobsRunning: runningJobs,
          deadLetterQueueSize: failedJobs, // Simplified - failed jobs act as DLQ
          lastSuccessfulDiscovery,
          lastSuccessfulHarvest,
          totalJobs,
          completedJobs,
          failedJobs,
          successRate: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0
        } as SystemHealth & { totalJobs: number; completedJobs: number; failedJobs: number; successRate: number };
      });

      // Step 2: Check for alerts
      const alerts = await step.run("check-for-alerts", async () => {
        const alerts = [];
        const now = new Date();

        // Alert if kill switch is active
        if (healthData.killSwitchActive) {
          alerts.push({
            type: "warning",
            message: "Kill switch is currently active"
          });
        }

        // Alert if no recent discoveries (over 30 minutes)
        if (healthData.lastSuccessfulDiscovery) {
          const discoveryDate = new Date(healthData.lastSuccessfulDiscovery);
          const minutesSinceDiscovery = (now.getTime() - discoveryDate.getTime()) / (1000 * 60);
          if (minutesSinceDiscovery > 30) {
            alerts.push({
              type: "error",
              message: `No successful discovery in ${Math.round(minutesSinceDiscovery)} minutes`
            });
          }
        }

        // Alert if no recent harvesting (over 60 minutes)
        if (healthData.lastSuccessfulHarvest) {
          const harvestDate = new Date(healthData.lastSuccessfulHarvest);
          const minutesSinceHarvest = (now.getTime() - harvestDate.getTime()) / (1000 * 60);
          if (minutesSinceHarvest > 60) {
            alerts.push({
              type: "error",
              message: `No successful harvest in ${Math.round(minutesSinceHarvest)} minutes`
            });
          }
        }

        // Alert if success rate is low
        if (healthData.totalJobs > 10 && healthData.successRate < 70) {
          alerts.push({
            type: "warning",
            message: `Low job success rate: ${healthData.successRate.toFixed(1)}%`
          });
        }

        return alerts;
      });

      // Step 3: Log health check results
      await step.run("log-health-check", async () => {
        await supabase
          .from("system_logs")
          .insert({
            event_type: "health_check",
            message: `System health check completed. Alerts: ${alerts.length}`,
            metadata: {
              ...healthData,
              alerts,
              timestamp: new Date().toISOString()
            }
          });
      });

      logger.info("Health check completed", {
        ...healthData,
        alertCount: alerts.length
      });

      return {
        success: true,
        data: {
          health: healthData,
          alerts
        },
        metadata: {
          executionTime: Date.now()
        }
      } as JobResult;

    } catch (error) {
      logger.error("Health check failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      throw error;
    }
  }
);

// Dead letter queue processor
export const deadLetterQueueJob = inngest.createFunction(
  {
    id: "system-dead-letter-queue",
    name: "Dead Letter Queue Processor",
    retries: 1,
  },
  { event: "tiktok/system.retry" },
  async ({ event, step, logger }) => {
    const { originalEventName, originalPayload, attempt, lastError } = event.data;

    logger.warn("Processing dead letter queue item", {
      originalEventName,
      attempt,
      lastError
    });

    try {
      // Step 1: Log the failed job
      await step.run("log-failed-job", async () => {
        await supabase
          .from("dead_letter_queue")
          .insert({
            original_event_name: originalEventName,
            original_payload: originalPayload,
            attempt_count: attempt,
            last_error: lastError,
            created_at: new Date().toISOString(),
            status: 'pending'
          });

        logger.info("Failed job logged to dead letter queue");
      });

      // Step 2: Check if we should retry (basic policy: retry once after 1 hour)
      const shouldRetry = await step.run("check-retry-policy", async () => {
        // For MVP, we don't automatically retry from DLQ
        // This would be expanded later with more sophisticated retry policies
        return false;
      });

      if (shouldRetry) {
        await step.run("schedule-retry", async () => {
          // Schedule retry (this would be implemented based on requirements)
          logger.info("Retry scheduled for failed job");
        });
      }

      return {
        success: true,
        data: {
          originalEventName,
          logged: true,
          retryScheduled: shouldRetry
        }
      } as JobResult;

    } catch (error) {
      logger.error("Dead letter queue processing failed", {
        error: error instanceof Error ? error.message : String(error),
        originalEventName,
        attempt
      });

      throw error;
    }
  }
);

// Job status tracking
export const jobStatusJob = inngest.createFunction(
  {
    id: "system-job-status",
    name: "Job Status Tracking",
    retries: 1,
  },
  { event: "tiktok/job.status.update" },
  async ({ event, step, logger }) => {
    const { jobId, status, metadata } = event.data;

    try {
      await step.run("update-job-status", async () => {
        // Upsert job status
        const { error } = await supabase
          .from("job_status")
          .upsert({
            job_id: jobId,
            status,
            metadata,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'job_id'
          });

        if (error) {
          throw new Error(`Failed to update job status: ${error.message}`);
        }

        logger.info("Job status updated", { jobId, status });
      });

      return {
        success: true,
        data: { jobId, status, updated: true }
      } as JobResult;

    } catch (error) {
      logger.error("Job status update failed", {
        error: error instanceof Error ? error.message : String(error),
        jobId,
        status
      });

      throw error;
    }
  }
);

// Maintenance cleanup job
export const maintenanceCleanupJob = inngest.createFunction(
  {
    id: "maintenance-cleanup",
    name: "Maintenance Data Cleanup",
    retries: 1,
  },
  [
    { event: "tiktok/maintenance.cleanup" },
    { cron: "0 2 * * 0" } // Weekly at 2 AM on Sunday
  ],
  async ({ event, step, logger }) => {
    const { daysToKeep = 90 } = event.data;

    logger.info("Starting maintenance cleanup", { daysToKeep });

    try {
      const cleanupResult = await step.run("cleanup-old-data", async () => {
        const { data, error } = await supabase
          .rpc("cleanup_old_data", { days_to_keep: daysToKeep });

        if (error) {
          throw new Error(`Cleanup failed: ${error.message}`);
        }

        return data[0]; // Function returns array with single result
      });

      // Clean up old job statuses and logs
      await step.run("cleanup-system-tables", async () => {
        const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

        // Clean old job statuses
        await supabase
          .from("job_status")
          .delete()
          .lt("created_at", cutoffDate.toISOString());

        // Clean old system logs
        await supabase
          .from("system_logs")
          .delete()
          .lt("created_at", cutoffDate.toISOString());

        // Clean processed DLQ items older than 30 days
        const dlqCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        await supabase
          .from("dead_letter_queue")
          .delete()
          .lt("created_at", dlqCutoff.toISOString())
          .eq("status", "processed");
      });

      logger.info("Maintenance cleanup completed", {
        deletedComments: cleanupResult?.deleted_comments || 0,
        deletedMentions: cleanupResult?.deleted_mentions || 0,
        deletedVideos: cleanupResult?.deleted_videos || 0,
        daysToKeep
      });

      return {
        success: true,
        data: {
          deletedComments: cleanupResult?.deleted_comments || 0,
          deletedMentions: cleanupResult?.deleted_mentions || 0,
          deletedVideos: cleanupResult?.deleted_videos || 0,
          cleanupDate: new Date().toISOString()
        }
      } as JobResult;

    } catch (error) {
      logger.error("Maintenance cleanup failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        daysToKeep
      });

      throw error;
    }
  }
);