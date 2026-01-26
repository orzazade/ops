/**
 * Effort estimation heuristics for work items.
 *
 * Provides quick/medium/deep effort estimates based on item type
 * and title keywords to help users gauge time commitment.
 */

import type { ScoredItem } from '../triage/types.js';
import type { EffortEstimate } from './types.js';

/**
 * Estimate effort for a work item.
 *
 * Heuristics:
 * - Quick (30min): PRs, updates, short titles
 * - Deep (half-day+): implement, refactor, design
 * - Medium (2 hours): default
 *
 * @param item - Scored item to estimate
 * @returns Effort estimate with level, duration, and reasoning
 */
export function estimateEffort(item: ScoredItem): EffortEstimate {
  const { item: scoreableItem } = item;
  const type = scoreableItem.type;
  const title = scoreableItem.item.title.toLowerCase();

  // Quick effort (30min)
  if (type === 'pull_request') {
    return {
      level: 'quick',
      duration: '30 minutes',
      reasoning: 'PR review typically quick',
    };
  }

  if (
    title.includes('update') ||
    title.includes('fix typo') ||
    title.includes('status') ||
    title.length < 30
  ) {
    return {
      level: 'quick',
      duration: '30 minutes',
      reasoning: 'Short title or simple update',
    };
  }

  // Deep effort (half-day+)
  if (
    title.includes('implement') ||
    title.includes('refactor') ||
    title.includes('design') ||
    title.includes('architecture') ||
    title.includes('migrate') ||
    title.includes('create new')
  ) {
    return {
      level: 'deep',
      duration: 'half-day or more',
      reasoning: 'Complex implementation or design work',
    };
  }

  // Medium effort (2 hours) - default
  return {
    level: 'medium',
    duration: '2 hours',
    reasoning: 'Standard work item',
  };
}
