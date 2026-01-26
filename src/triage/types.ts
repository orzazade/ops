/**
 * Triage types for priority scoring system.
 *
 * This module defines types for scoring work items and pull requests
 * based on configurable priority rules.
 */

import type { CompressedWorkItem, CompressedPR } from '../context/types.js';

/**
 * Scoreable item type discriminant for type-safe handling.
 * Note: Only ADO work items and PRs are scored - GSD projects tracked separately.
 */
export type ScoreableItemType = 'work_item' | 'pull_request';

/**
 * Scoreable work item with type discriminant.
 */
export interface ScoreableWorkItem {
  type: 'work_item';
  item: CompressedWorkItem;
}

/**
 * Scoreable pull request with type discriminant.
 */
export interface ScoreablePR {
  type: 'pull_request';
  item: CompressedPR;
}

/**
 * Union type for items that can be scored by the triage system.
 * Uses type discriminant for type-safe handling.
 */
export type ScoreableItem = ScoreableWorkItem | ScoreablePR;

/**
 * Applied scoring rule tracking.
 * Records which rule matched and contributed to the score.
 */
export interface AppliedRule {
  name: string;
  weight: number;
}

/**
 * Scored item with priority score and applied rules.
 * Generic over the original item type.
 */
export interface ScoredItem<T extends ScoreableItem = ScoreableItem> {
  item: T;
  score: number;
  appliedRules: AppliedRule[];
}

/**
 * Scoring rule interface.
 * Each rule evaluates an item and returns whether it matches.
 */
export interface ScoringRule<T extends ScoreableItem = ScoreableItem> {
  name: keyof import('../config/schema.js').OpsConfig['priorities'];
  evaluate: (item: T) => boolean;
}
