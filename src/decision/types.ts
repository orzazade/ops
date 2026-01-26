/**
 * Decision support types for recommendation generation.
 *
 * Defines types for candidate selection, recommendation generation,
 * and supporting utilities (effort estimation, alternatives).
 */

import type { ScoredItem } from '../triage/types.js';
import type { WorkTypeHints } from './work-classifier.js';

/**
 * Effort level categories.
 */
export type EffortLevel = 'quick' | 'medium' | 'deep';

/**
 * Effort estimate with level, duration, and reasoning.
 */
export interface EffortEstimate {
  level: EffortLevel;
  duration: string;
  reasoning: string;
}

/**
 * Decision candidate with scored item, work type hints, time-fit score, and final score.
 */
export interface DecisionCandidate {
  scored: ScoredItem;
  workType: WorkTypeHints;
  timeFit: number;
  finalScore: number;
}

/**
 * Alternative recommendation option for close-scoring items.
 */
export interface Alternative {
  item: ScoredItem;
  oneLiner: string;
}

/**
 * Recommendation with reasoning, effort estimate, suggested action, and optional alternatives.
 */
export interface Recommendation {
  item: ScoredItem;
  reasoning: string;
  effort: EffortEstimate;
  suggestedAction: string;
  contextLinks: string[];
  alternatives: Alternative[];
}

/**
 * Result when no work available.
 */
export interface NoWorkResult {
  type: 'no-work';
  message: string;
}

/**
 * Result when top candidate has low confidence.
 */
export interface LowConfidenceResult {
  type: 'low-confidence';
  topCandidate: DecisionCandidate;
  reasoning: string;
}

/**
 * Result with recommendation.
 */
export interface RecommendationResult {
  type: 'recommendation';
  recommendation: Recommendation;
}

/**
 * Union type for decision results.
 */
export type DecisionResult = NoWorkResult | LowConfidenceResult | RecommendationResult;
