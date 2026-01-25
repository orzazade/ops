/**
 * Researchers module public API.
 * Exports all researcher implementations and orchestration utilities.
 */

// Export types
export type {
  Researcher,
  ResearcherOutput,
  ADOData,
  GSDData,
  WorkItemData,
  PullRequestData,
  ReviewerInfo,
  SprintData,
  GSDProject,
} from './types.js';

// Export researcher implementations
export { ADOResearcher, type ADOResearcherConfig } from './ado-researcher.js';
export { GSDResearcher } from './gsd-researcher.js';

// Export orchestrator
export { ResearchOrchestrator, type ResearchResults } from './orchestrator.js';
