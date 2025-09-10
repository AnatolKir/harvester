// Main Inngest export file (moved under web/ to satisfy Vercel build)
export { inngest } from './client';
export { allJobs } from './jobs';
export * from './types';

// Re-export individual jobs for convenience
export * from './jobs/discovery';
export * from './jobs/harvesting';
export * from './jobs/system';
export * from './jobs/discovery-backfill';
export * from './jobs/enrichment-http';
export * from './jobs/enrichment-dnswhois';
export * from './jobs/mv-refresh';

// Export monitoring functions
export * from './monitoring';

// Helper functions for manual job triggers
import { inngest } from './client';
import { Events } from './types';

export async function triggerVideoDiscovery(
  payload: Events['tiktok/video.discovery.manual']['data']
) {
  return await inngest.send({
    name: 'tiktok/video.discovery.manual',
    data: payload,
  });
}

export async function triggerDiscoveryBackfill(
  payload: Events['tiktok/video.discovery.backfill']['data']
) {
  return await inngest.send({
    name: 'tiktok/video.discovery.backfill',
    data: payload,
  });
}

export async function triggerCommentHarvesting(payload: Events['tiktok/comment.harvest']['data']) {
  return await inngest.send({
    name: 'tiktok/comment.harvest',
    data: payload,
  });
}

export async function activateKillSwitch(payload: Events['tiktok/system.kill_switch']['data']) {
  return await inngest.send({
    name: 'tiktok/system.kill_switch',
    data: payload,
  });
}

export async function deactivateKillSwitch(
  payload: Events['tiktok/system.deactivate_kill_switch']['data']
) {
  return await inngest.send({
    name: 'tiktok/system.deactivate_kill_switch',
    data: payload,
  });
}

export async function triggerHealthCheck() {
  return await inngest.send({
    name: 'tiktok/system.health_check',
    data: {},
  });
}

export async function triggerMaintenanceCleanup(daysToKeep: number = 90) {
  return await inngest.send({
    name: 'tiktok/maintenance.cleanup',
    data: { daysToKeep },
  });
}


