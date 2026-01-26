/**
 * Investigator module for deep ticket research.
 * Provides types and interfaces for parallel ticket investigation.
 */

export type {
  InvestigationContext,
  Investigator,
  CodeFinding,
  CodeFindings,
  WorkItemWithRelations,
  RelatedWorkItem,
  TicketFindings,
  WikiFinding,
  WikiFindings,
  InvestigationResults,
  InvestigationSummary,
  WorkItemUpdate,
} from './types.js';

export { TicketInvestigator } from './ticket-investigator.js';
export { CodeInvestigator, extractKeywords } from './code-investigator.js';
export { WikiInvestigator } from './wiki-investigator.js';
export { InvestigationOrchestrator } from './orchestrator.js';
