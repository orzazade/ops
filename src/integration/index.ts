/**
 * Integration module for briefing persistence and carryover logic.
 * Provides history persistence and yesterday comparison functionality.
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

// Type exports
export type { CarryoverResult } from './types.js';
