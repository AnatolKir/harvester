import { inngest } from "../client";
import { Events, JobResult, CommentHarvestingPayload } from "../types";
import { createClient } from "@supabase/supabase-js";
import { MCPClient } from "../../web/src/lib/mcp/client";
import { fetchCommentsForVideo } from "../../web/src/lib/mcp/comments";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const commentHarvestingJob = inngest.createFunction(
  {
    id: "comment-harvesting",
    name: "TikTok Comment Harvesting",
    retries: 3,
    concurrency: {
      limit: 10,
    },
  },
  { event: "tiktok/comment.harvest" },
  async ({ event, step, logger, attempt }) => {
    const { videoId, maxPages = 2, delayBetweenPages = 1000 } = event.data;

    logger.info("Starting comment harvesting job", {
      videoId,
      maxPages,
      delayBetweenPages,
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
        logger.warn("Kill switch is active, aborting harvesting job");
        return {
          success: false,
          error: "Kill switch is active",
          metadata: { killSwitchTriggered: true }
        };
      }

      // Step 2: Verify video exists and needs harvesting
      const videoInfo = await step.run("verify-video", async () => {
        const { data: video, error } = await supabase
          .from("video")
          .select("id, video_id, last_scraped_at")
          .eq("id", videoId)
          .single();

        if (error) {
          throw new Error(`Video not found: ${error.message}`);
        }

        return video;
      });

      // Step 3: Update job status
      await step.run("update-job-status", async () => {
        await inngest.send({
          name: "tiktok/job.status.update",
          data: {
            jobId: `harvesting-${videoId}-${Date.now()}`,
            status: "running",
            metadata: { videoId, attempt, maxPages }
          }
        });
      });

      // Step 4: Rate limiting check
      await step.run("rate-limit-check", async () => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      });

      // Step 5: Harvest comments via MCP
      const harvestResult = await step.run("harvest-comments", async () => {
        const mcp = new MCPClient({
          baseUrl: process.env.MCP_BASE_URL!,
          apiKey: process.env.BRIGHTDATA_MCP_API_KEY!,
          stickyMinutes: parseInt(process.env.MCP_STICKY_SESSION_MINUTES || "10"),
        });
        const comments = await fetchCommentsForVideo(mcp, videoId, { maxPages });

        let inserted = 0;
        for (const c of comments) {
          const { error } = await supabase
            .from("comment")
            .upsert(
              {
                id: c.comment_id,
                video_id: videoId,
                comment_id: c.comment_id,
                content: c.text,
                author_username: c.user_id,
                posted_at: c.created_at,
              },
              { onConflict: "id" }
            );
          if (!error) inserted++;
        }

        return { commentsHarvested: comments.length, pagesProcessed: maxPages, domainsExtracted: 0, newComments: comments };
      });

      // Step 6: Update video last_crawled_at
      await step.run("update-video-crawled", async () => {
        const { error } = await supabase
          .from("video")
          .update({
            last_scraped_at: new Date().toISOString(),
            comment_count: harvestResult.commentsHarvested
          })
          .eq("id", videoId);

        if (error) {
          logger.warn("Failed to update video last_crawled_at", { error: error instanceof Error ? error.message : String(error) });
        }
      });

      // Step 7: Trigger domain extraction for new comments (if any)
      if (harvestResult.newComments && harvestResult.newComments.length > 0) {
        await step.run("trigger-domain-extraction", async () => {
          const extractionPromises = harvestResult.newComments.map((comment: any) =>
            inngest.send({
              name: "tiktok/domain.extract",
              data: { commentId: comment.comment_id, videoId: videoId, commentText: comment.text }
            })
          );

          await Promise.all(extractionPromises);
          
          logger.info("Triggered domain extraction jobs", {
            count: extractionPromises.length
          });
        });
      }

      // Step 8: Update final job status
      await step.run("complete-job-status", async () => {
        await inngest.send({
          name: "tiktok/job.status.update",
          data: {
            jobId: `harvesting-${videoId}-${Date.now()}`,
            status: "completed",
            metadata: {
              videoId,
              commentsHarvested: harvestResult.commentsHarvested,
              pagesProcessed: harvestResult.pagesProcessed,
              domainsExtracted: harvestResult.domainsExtracted,
              extractionJobsTriggered: harvestResult.newComments?.length || 0
            }
          }
        });
      });

      return {
        success: true,
        data: {
          videoId,
          commentsHarvested: harvestResult.commentsHarvested,
          pagesProcessed: harvestResult.pagesProcessed,
          domainsExtracted: harvestResult.domainsExtracted
        },
        metadata: {
          executionTime: Date.now(),
          attempt
        }
      } as JobResult;

    } catch (error) {
      logger.error("Comment harvesting job failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        videoId,
        attempt
      });

      // Update job status to failed
      await step.run("fail-job-status", async () => {
        await inngest.send({
          name: "tiktok/job.status.update",
          data: {
            jobId: `harvesting-${videoId}-${Date.now()}`,
            status: "failed",
            metadata: {
              videoId,
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
              originalEventName: "tiktok/comment.harvest",
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

export const domainExtractionJob = inngest.createFunction(
  {
    id: "domain-extraction",
    name: "Domain Extraction from Comments",
    retries: 2,
    concurrency: {
      limit: 50,
    },
  },
  { event: "tiktok/domain.extract" },
  async ({ event, step, logger, attempt }) => {
    const { commentId, videoId, commentText } = event.data;

    logger.info("Starting domain extraction job", {
      commentId,
      videoId,
      commentTextLength: commentText.length,
      attempt,
    });

    try {
      // Step 1: Extract domains from comment text
      const domains = await step.run("extract-domains", async () => {
        // Domain extraction regex (basic implementation)
        const domainRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/g;
        const matches = commentText.match(domainRegex);
        
        if (!matches) return [];

        return matches.map((match: string) => {
          // Clean up the domain
          let domain = match.replace(/^https?:\/\//, '').replace(/^www\./, '');
          // Remove trailing slash and path
          domain = domain.split('/')[0];
          
          const parts = domain.split('.');
          return {
            fullDomain: domain,
            tld: parts[parts.length - 1],
            subdomain: parts.length > 2 ? parts.slice(0, -2).join('.') : null,
            domainName: parts.length > 1 ? parts.slice(-2).join('.') : domain,
            originalText: match
          };
        });
      });

      if (domains.length === 0) {
        logger.info("No domains found in comment", { commentId });
        return {
          success: true,
          data: { domainsExtracted: 0 },
          metadata: { attempt }
        };
      }

      // Step 2: Process each domain
      const processingResults = await step.run("process-domains", async () => {
        const results = [];
        
        for (const domainInfo of domains) {
          try {
            // Check if domain exists, create if not
            const { data: existingDomain, error: selectError } = await supabase
              .from("domain")
              .select("id")
              .eq("domain", domainInfo.domainName)
              .maybeSingle();

            let domainId;
            
            if (existingDomain) {
              domainId = existingDomain.id;
            } else {
              // Create new domain
              const { data: newDomain, error: insertError } = await supabase
                .from("domain")
                .insert({
                  domain: domainInfo.domainName,
                  first_seen: new Date().toISOString(),
                  last_seen: new Date().toISOString(),
                })
                .select("id")
                .single();

              if (insertError) {
                logger.error("Failed to create domain", {
                  domain: domainInfo.domainName,
                  error: insertError instanceof Error ? insertError.message : String(insertError)
                });
                continue;
              }

              domainId = newDomain.id;
            }

            // Create domain mention
            const { error: mentionError } = await supabase
              .from("domain_mention")
              .insert({
                domain: domainInfo.domainName,
                comment_id: commentId,
                video_id: videoId,
                created_at: new Date().toISOString()
              })
              .onConflict('domain,video_id,comment_id');

            if (mentionError) {
              logger.error("Failed to create domain mention", {
                domainId,
                commentId,
                error: mentionError instanceof Error ? mentionError.message : String(mentionError)
              });
              continue;
            }

            results.push({
              domainId,
              domainName: domainInfo.domainName,
              mentionText: domainInfo.originalText
            });

          } catch (error) {
            logger.error("Failed to process domain", {
              domain: domainInfo.domainName,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }

        return results;
      });

      logger.info("Domain extraction completed", {
        commentId,
        domainsExtracted: processingResults.length,
        totalDomainsFound: domains.length
      });

      return {
        success: true,
        data: {
          domainsExtracted: processingResults.length,
          domains: processingResults
        },
        metadata: {
          executionTime: Date.now(),
          attempt
        }
      } as JobResult;

    } catch (error) {
      logger.error("Domain extraction job failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        commentId,
        attempt
      });

      throw error;
    }
  }
);