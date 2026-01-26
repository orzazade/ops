/**
 * Sprint intelligence module.
 * Public API for sprint capacity management and work item distribution.
 */

// Core workflow
export { executeSprintWorkflow } from './workflow.js';
export type { SprintWorkflowResult } from './workflow.js';

// Types
export type {
  SprintItem,
  SprintState,
  FutureSprint,
  DistributionResult,
  DeferralSuggestion,
  LoadAnalysis,
} from './types.js';

// Capacity analysis
export { analyzeLoad, distributeItems, suggestDeferrals } from './capacity.js';

// Display utilities
export {
  formatSprintItem,
  formatSprintChoices,
  formatCapacityHeader,
  formatSelectionSummary,
  formatDeferralSuggestions,
} from './display.js';

// Move operations
export { moveItemsToSprint, executeDistribution } from './operations.js';
export type { MoveResult } from './operations.js';
