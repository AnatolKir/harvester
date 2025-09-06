import { inngest } from "../client";
import { Events, JobResult, VideoDiscoveryPayload } from "../types";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const videoDiscoveryJob = inngest.createFunction(
  {
    id: "video-discovery",
    name: "TikTok Video Discovery",
    retries: 3,
    concurrency: {
      limit: 5,
    },
  },
  [
    { event: "tiktok/video.discovery.scheduled" },
    { cron: "*/10 * * * *" } // Every 10 minutes
  ],
  async ({ event, step, logger, attempt }) => {
    const { videoId, forceRefresh = false, limit = 50 } = event.data;

    logger.info("Starting video discovery job", {
      videoId,
      forceRefresh,
      limit,
      attempt,
    });

    try {
      // Step 1: Check kill switch
      const killSwitchActive = await step.run("check-kill-switch", async () => {
        const { data: killSwitch } = await supabase
          .from("system_config")
          .select("value")
          .eq("key", "kill_switch_active")
          .maybeSingle();
        
        return killSwitch?.value === true;
      });

      if (killSwitchActive) {
        logger.warn("Kill switch is active, aborting discovery job");
        return {
          success: false,
          error: "Kill switch is active",
          metadata: { killSwitchTriggered: true }
        };
      }

      // Step 2: Update job status
      await step.run("update-job-status", async () => {
        await inngest.send({
          name: "tiktok/job.status.update",
          data: {
            jobId: `discovery-${Date.now()}`,
            status: "running",
            metadata: { videoId, attempt }
          }
        });
      });

      // Step 3: Discover promoted videos
      const discoveryResult = await step.run("discover-videos", async () => {
        try {
          // Call the worker service to discover videos
          const workerUrl = process.env.WORKER_WEBHOOK_URL;
          if (!workerUrl) {
            throw new Error("WORKER_WEBHOOK_URL not configured");
          }

          const response = await fetch(`${workerUrl}/discover`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.WORKER_API_KEY || 'development'}`
            },
            body: JSON.stringify({
              videoId,
              forceRefresh,
              limit
            })
          });

          if (!response.ok) {
            throw new Error(`Worker discovery failed: ${response.status} ${response.statusText}`);
          }

          const result = await response.json();
          
          logger.info("Video discovery completed", {
            videosFound: result.videosFound || 0,
            newVideos: result.newVideos || 0
          });

          return result;
        } catch (error) {
          logger.error("Discovery step failed", { error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      });

      // Step 4: Trigger harvesting for new videos
      if (discoveryResult.newVideos > 0) {
        await step.run("trigger-harvesting", async () => {
          const harvestingPromises = discoveryResult.videoIds.map((videoId: string) =>
            inngest.send({
              name: "tiktok/comment.harvest",
              data: {
                videoId,
                maxPages: 2, // MVP constraint: 1-2 pages per video
                delayBetweenPages: 1000
              }
            })
          );

          await Promise.all(harvestingPromises);
          
          logger.info("Triggered harvesting jobs", {
            count: harvestingPromises.length
          });
        });
      }

      // Step 5: Update final job status
      await step.run("complete-job-status", async () => {
        await inngest.send({
          name: "tiktok/job.status.update",
          data: {
            jobId: `discovery-${Date.now()}`,
            status: "completed",
            metadata: {
              videosFound: discoveryResult.videosFound,
              newVideos: discoveryResult.newVideos,
              harvestingJobsTriggered: discoveryResult.newVideos
            }
          }
        });
      });

      return {
        success: true,
        data: {
          videosFound: discoveryResult.videosFound,
          newVideos: discoveryResult.newVideos,
          harvestingJobsTriggered: discoveryResult.newVideos
        },
        metadata: {
          executionTime: Date.now(),
          attempt
        }
      } as JobResult;

    } catch (error) {
      logger.error("Video discovery job failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        attempt
      });

      // Update job status to failed
      await step.run("fail-job-status", async () => {
        await inngest.send({
          name: "tiktok/job.status.update",
          data: {
            jobId: `discovery-${Date.now()}`,
            status: "failed",
            metadata: {
              error: error instanceof Error ? error.message : String(error),
              attempt,
              willRetry: attempt < 3
            }
          }
        });
      });

      // If this is the final attempt, send to dead letter queue
      if (attempt >= 3) {
        await step.run("send-to-dead-letter-queue", async () => {
          await inngest.send({
            name: "tiktok/system.retry",
            data: {
              originalEventName: "tiktok/video.discovery.scheduled",
              originalPayload: event.data,
              attempt,
              lastError: error instanceof Error ? error.message : String(error)
            }
          });
        });
      }

      throw error;
    }
  }
);

// Manual discovery trigger (for admin use)
// TODO: Fix this to properly share logic with scheduled discovery
export const manualVideoDiscoveryJob = inngest.createFunction(
  {
    id: "manual-video-discovery",
    name: "Manual TikTok Video Discovery",
    retries: 1,
    concurrency: {
      limit: 2,
    },
  },
  { event: "tiktok/video.discovery.manual" },
  async ({ event, step, logger, attempt }) => {
    const { videoId, forceRefresh = false, limit = 50 } = event.data;

    logger.info("Starting manual video discovery job", {
      videoId,
      forceRefresh,
      limit,
      attempt,
    });

    // For now, just return a placeholder result
    // TODO: Implement proper discovery logic that shares code with scheduled job
    return {
      success: true,
      data: {
        message: "Manual discovery triggered",
        videoId,
        forceRefresh,
        limit
      }
    } as JobResult;
  }
);