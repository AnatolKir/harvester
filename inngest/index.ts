// Main Inngest export file
export { inngest } from './client';
export { allJobs } from './jobs';
export * from './types';

// Re-export individual jobs for convenience
export * from './jobs/discovery';
export * from './jobs/harvesting';
export * from './jobs/system';
export * from './jobs/discovery-backfill';

// Helper functions for manual job triggers
import { inngest } from './client';
import { Events } from './types';

/**
 * Manually trigger video discovery
 */
export async function triggerVideoDiscovery(
  payload: Events['tiktok/video.discovery.manual']['data']
) {
  return await inngest.send({
    name: 'tiktok/video.discovery.manual',
    data: payload,
  });
}

/**
 * Manually trigger discovery backfill
 */
export async function triggerDiscoveryBackfill(
  payload: Events['tiktok/video.discovery.backfill']['data']
) {
  return await inngest.send({
    name: 'tiktok/video.discovery.backfill',
    data: payload,
  });
}

/**
 * Manually trigger comment harvesting for a video
 */
export async function triggerCommentHarvesting(payload: Events['tiktok/comment.harvest']['data']) {
  return await inngest.send({
    name: 'tiktok/comment.harvest',
    data: payload,
  });
}

/**
 * Activate the kill switch to stop all jobs
 */
export async function activateKillSwitch(payload: Events['tiktok/system.kill_switch']['data']) {
  return await inngest.send({
    name: 'tiktok/system.kill_switch',
    data: payload,
  });
}

/**
 * Deactivate the kill switch to resume jobs
 */
export async function deactivateKillSwitch(
  payload: Events['tiktok/system.deactivate_kill_switch']['data']
) {
  return await inngest.send({
    name: 'tiktok/system.deactivate_kill_switch',
    data: payload,
  });
}

/**
 * Trigger a system health check
 */
export async function triggerHealthCheck() {
  return await inngest.send({
    name: 'tiktok/system.health_check',
    data: {},
  });
}

/**
 * Trigger maintenance cleanup
 */
export async function triggerMaintenanceCleanup(daysToKeep: number = 90) {
  return await inngest.send({
    name: 'tiktok/maintenance.cleanup',
    data: { daysToKeep },
  });
}
