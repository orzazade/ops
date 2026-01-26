/**
 * Integration module for briefing persistence and carryover logic.
 * Provides history persistence, yesterday comparison, and morning workflow orchestration.
 */

// History persistence exports
export {
  getDateFilename,
  persistBriefing,
  loadBriefing,
  loadYesterdayBriefing,
} from './history-persistence.js';

// Carryover logic exports
export { identifyCarryover } from './carryover.js';

// Morning workflow exports
export {
  executeMorningWorkflow,
  gatherMorningData,
  determineBriefingTier,
} from './morning-workflow.js';

// Status workflow exports
export {
  gatherProjectStatus,
  determineStatusTier,
} from './status-workflow.js';

// Project filter exports
export { filterByProject } from './project-filter.js';

// Response workflow exports
export { generateResponseDraft } from './respond-workflow.js';

// Type exports
export type { CarryoverResult } from './types.js';
export type { MorningWorkflowResult, MorningDataResult } from './morning-workflow.js';
export type { StatusDataResult } from './status-workflow.js';
export type { ProjectFilter } from './project-filter.js';
