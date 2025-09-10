import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  triggerVideoDiscovery,
  triggerCommentHarvesting,
  activateKillSwitch,
  deactivateKillSwitch,
  triggerHealthCheck,
  triggerMaintenanceCleanup,
  triggerDiscoveryBackfill,
} from "../../inngest";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Admin functions for Inngest job management
export class InngestAdmin {
  /**
   * Get current system health status
   */
  static async getSystemHealth() {
    try {
      const { data, error } =
        await supabase.rpc<unknown[]>("get_system_health");

      if (error) throw error;

      return (data as unknown[])[0];
    } catch (error) {
      console.error("Failed to get system health:", error);
      throw error;
    }
  }

  /**
   * Get job execution metrics
   */
  static async getJobMetrics(jobType?: string, hoursBack: number = 24) {
    try {
      const { data, error } = await supabase.rpc<unknown[]>("get_job_metrics", {
        job_type_filter: jobType || null,
        hours_back: hoursBack,
      } as unknown as never);

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Failed to get job metrics:", error);
      throw error;
    }
  }

  /**
   * Get recent system logs
   */
  static async getRecentLogs(limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Failed to get recent logs:", error);
      throw error;
    }
  }

  /**
   * Get active jobs
   */
  static async getActiveJobs() {
    try {
      const { data, error } = await supabase.from("v_active_jobs").select("*");

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Failed to get active jobs:", error);
      throw error;
    }
  }

  /**
   * Get dead letter queue items
   */
  static async getDeadLetterQueue(status?: string) {
    try {
      let query = supabase
        .from("dead_letter_queue")
        .select("*")
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Failed to get dead letter queue:", error);
      throw error;
    }
  }

  /**
   * Check if kill switch is active
   */
  static async isKillSwitchActive(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "kill_switch_active")
        .returns<{ value: boolean }>()
        .single();

      if (error) throw error;

      return Boolean(data?.value === true);
    } catch (error) {
      console.error("Failed to check kill switch status:", error);
      return false;
    }
  }

  /**
   * Activate emergency kill switch
   */
  static async activateEmergencyStop(reason: string, requestedBy: string) {
    try {
      await activateKillSwitch({
        reason,
        requestedBy,
        timestamp: new Date().toISOString(),
      });

      return { success: true, message: "Kill switch activated" };
    } catch (error) {
      console.error("Failed to activate kill switch:", error);
      throw error;
    }
  }

  /**
   * Deactivate kill switch
   */
  static async deactivateEmergencyStop(reason: string, requestedBy: string) {
    try {
      await deactivateKillSwitch({
        reason,
        requestedBy,
      });

      return { success: true, message: "Kill switch deactivated" };
    } catch (error) {
      console.error("Failed to deactivate kill switch:", error);
      throw error;
    }
  }

  /**
   * Manually trigger video discovery
   */
  static async triggerDiscovery(
    options: {
      videoId?: string;
      forceRefresh?: boolean;
      limit?: number;
    } = {}
  ) {
    try {
      await triggerVideoDiscovery({
        videoId: options.videoId,
        forceRefresh: options.forceRefresh || false,
        limit: options.limit || 50,
      });

      return { success: true, message: "Discovery job triggered" };
    } catch (error) {
      console.error("Failed to trigger discovery:", error);
      throw error;
    }
  }

  /**
   * Manually trigger comment harvesting
   */
  static async triggerHarvesting(videoId: string, maxPages: number = 2) {
    try {
      await triggerCommentHarvesting({
        videoId,
        maxPages,
        delayBetweenPages: 1000,
      });

      return { success: true, message: "Harvesting job triggered" };
    } catch (error) {
      console.error("Failed to trigger harvesting:", error);
      throw error;
    }
  }

  /**
   * Manually trigger discovery backfill
   */
  static async triggerBackfill(days: number, limit: number = 100) {
    try {
      await triggerDiscoveryBackfill({ days, limit });
      return { success: true, message: "Backfill job triggered" };
    } catch (error) {
      console.error("Failed to trigger backfill:", error);
      throw error;
    }
  }

  /**
   * Trigger system health check
   */
  static async runHealthCheck() {
    try {
      await triggerHealthCheck();

      return { success: true, message: "Health check triggered" };
    } catch (error) {
      console.error("Failed to trigger health check:", error);
      throw error;
    }
  }

  /**
   * Trigger maintenance cleanup
   */
  static async runMaintenance(daysToKeep: number = 90) {
    try {
      await triggerMaintenanceCleanup(daysToKeep);

      return { success: true, message: "Maintenance cleanup triggered" };
    } catch (error) {
      console.error("Failed to trigger maintenance:", error);
      throw error;
    }
  }

  /**
   * Update system configuration
   */
  static async updateConfig(key: string, value: unknown, description?: string) {
    try {
      const { error } = await supabase.from("system_config").upsert(
        {
          key,
          value,
          description,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "key",
        }
      );

      if (error) throw error;

      return { success: true, message: "Configuration updated" };
    } catch (error) {
      console.error("Failed to update configuration:", error);
      throw error;
    }
  }

  /**
   * Get all system configuration
   */
  static async getSystemConfig() {
    try {
      const { data, error } = await supabase
        .from("system_config")
        .select("*")
        .order("key");

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Failed to get system config:", error);
      throw error;
    }
  }

  /**
   * Retry a job from dead letter queue
   */
  static async retryDeadLetterJob(dlqId: string) {
    try {
      // Get the DLQ item
      const { error: fetchError } = await supabase
        .from("dead_letter_queue")
        .select("id")
        .eq("id", dlqId)
        .single();

      if (fetchError) throw fetchError;

      // Mark as retry scheduled
      const { error: updateError } = await supabase
        .from("dead_letter_queue")
        .update({
          status: "retry_scheduled",
          retry_after: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", dlqId);

      if (updateError) throw updateError;

      // Trigger the original event
      // Note: This would need to be implemented based on the specific event type

      return { success: true, message: "Job retry scheduled" };
    } catch (error) {
      console.error("Failed to retry dead letter job:", error);
      throw error;
    }
  }

  /**
   * Permanently delete a dead letter queue item
   */
  static async deleteDeadLetterItem(dlqId: string) {
    try {
      const { error } = await supabase
        .from("dead_letter_queue")
        .delete()
        .eq("id", dlqId);

      if (error) throw error;

      return { success: true, message: "DLQ item deleted" };
    } catch (error) {
      console.error("Failed to delete DLQ item:", error);
      throw error;
    }
  }
}
