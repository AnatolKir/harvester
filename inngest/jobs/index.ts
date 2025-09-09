// Export all Inngest job functions
export { videoDiscoveryJob, manualVideoDiscoveryJob } from './discovery';

export { discoveryBackfillJob } from './discovery-backfill';

export { commentHarvestingJob, domainExtractionJob } from './harvesting';
export { httpEnrichmentJob } from './enrichment-http';
export { dnsWhoisEnrichmentJob } from './enrichment-dnswhois';

export {
  killSwitchJob,
  deactivateKillSwitchJob,
  healthCheckJob,
  deadLetterQueueJob,
  jobStatusJob,
  maintenanceCleanupJob,
} from './system';

// Collect all functions for easy import
import { videoDiscoveryJob, manualVideoDiscoveryJob } from './discovery';

import { discoveryBackfillJob } from './discovery-backfill';

import { commentHarvestingJob, domainExtractionJob } from './harvesting';
import { httpEnrichmentJob } from './enrichment-http';
import { dnsWhoisEnrichmentJob } from './enrichment-dnswhois';

import {
  killSwitchJob,
  deactivateKillSwitchJob,
  healthCheckJob,
  deadLetterQueueJob,
  jobStatusJob,
  maintenanceCleanupJob,
} from './system';

export const allJobs = [
  // Discovery jobs
  videoDiscoveryJob,
  manualVideoDiscoveryJob,
  discoveryBackfillJob,

  // Harvesting jobs
  commentHarvestingJob,
  domainExtractionJob,
  httpEnrichmentJob,
  dnsWhoisEnrichmentJob,

  // System jobs
  killSwitchJob,
  deactivateKillSwitchJob,
  healthCheckJob,
  deadLetterQueueJob,
  jobStatusJob,
  maintenanceCleanupJob,
];
