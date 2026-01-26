/**
 * Triage module - Priority scoring for work items and pull requests.
 *
 * This module provides the foundation for intelligent triage by scoring
 * items based on configurable priority rules.
 *
 * @module triage
 */

export type {
  ScoreableItem,
  ScoreableWorkItem,
  ScoreablePR,
  ScoreableItemType,
  ScoredItem,
  ScoringRule,
  AppliedRule,
} from './types.js';

export { PriorityScorer } from './scorer.js';
