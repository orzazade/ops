/**
 * Triage module - Priority scoring and briefing generation.
 *
 * This module provides intelligent triage by scoring work items and
 * pull requests, then generating structured daily briefings using Claude AI.
 *
 * @module triage
 */

// Types
export type {
  ScoreableItem,
  ScoreableWorkItem,
  ScoreablePR,
  ScoreableItemType,
  ScoredItem,
  ScoringRule,
  AppliedRule,
} from './types.js';

// Schemas
export type { Briefing, BriefingItem, ResponseOption, ResponseDraft } from './schemas.js';
export { BriefingSchema, BriefingItemSchema, ResponseOptionSchema, ResponseDraftSchema } from './schemas.js';

// Classes
export { PriorityScorer } from './scorer.js';
export { BriefingGenerator } from './briefing.js';
export { ResponseGenerator } from './response-generator.js';

// Response types
export type { ResponseContext } from './response-generator.js';

// Overrides
export * from './overrides.js';
