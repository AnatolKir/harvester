// Export all Inngest job functions
export { 
  videoDiscoveryJob,
  manualVideoDiscoveryJob 
} from "./discovery";

export { 
  commentHarvestingJob,
  domainExtractionJob 
} from "./harvesting";

export {
  killSwitchJob,
  deactivateKillSwitchJob,
  healthCheckJob,
  deadLetterQueueJob,
  jobStatusJob,
  maintenanceCleanupJob
} from "./system";

// Collect all functions for easy import
import { 
  videoDiscoveryJob,
  manualVideoDiscoveryJob 
} from "./discovery";

import { 
  commentHarvestingJob,
  domainExtractionJob 
} from "./harvesting";

import {
  killSwitchJob,
  deactivateKillSwitchJob,
  healthCheckJob,
  deadLetterQueueJob,
  jobStatusJob,
  maintenanceCleanupJob
} from "./system";

export const allJobs = [
  // Discovery jobs
  videoDiscoveryJob,
  manualVideoDiscoveryJob,
  
  // Harvesting jobs
  commentHarvestingJob,
  domainExtractionJob,
  
  // System jobs
  killSwitchJob,
  deactivateKillSwitchJob,
  healthCheckJob,
  deadLetterQueueJob,
  jobStatusJob,
  maintenanceCleanupJob,
];