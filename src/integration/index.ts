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

// Type exports
export type { CarryoverResult } from './types.js';
export type { MorningWorkflowResult, MorningDataResult } from './morning-workflow.js';
