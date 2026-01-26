/**
 * Work type classification for cognitive load matching.
 *
 * Categorizes work items by cognitive load and interaction requirements
 * to help match work to appropriate time windows.
 */

import type { ScoredItem } from '../triage/types.js';

/**
 * Work type categories based on cognitive load and interaction needs.
 */
export type WorkType = 'deep' | 'admin' | 'meeting';

/**
 * Work type hints with classification and reasoning.
 */
export interface WorkTypeHints {
  type: WorkType;
  reasoning: string;
}

/**
 * Classify work item by cognitive load and interaction requirements.
 *
 * Uses heuristics based on item type and title keywords:
 * - Meeting type: PRs, review/meeting/discuss keywords (requires collaboration)
 * - Admin type: update/document/ticket keywords (quick, low cognitive load)
 * - Deep type: Complex work requiring focused attention (default)
 *
 * @param item - Scored item to classify
 * @returns Work type hints with classification and reasoning
 */
export function classifyWorkType(item: ScoredItem): WorkTypeHints {
  const { item: scoreableItem } = item;
  const type = scoreableItem.type;
  const title = scoreableItem.item.title.toLowerCase();
  const description =
    'description' in scoreableItem.item && scoreableItem.item.description
      ? scoreableItem.item.description.toLowerCase()
      : '';

  // Meeting-type work: Requires collaboration or review
  if (type === 'pull_request') {
    return {
      type: 'meeting',
      reasoning: 'PR requires review and collaboration',
    };
  }

  if (
    title.includes('review') ||
    title.includes('meeting') ||
    title.includes('discuss') ||
    description.includes('needs approval')
  ) {
    return {
      type: 'meeting',
      reasoning: 'Requires collaboration or review',
    };
  }

  // Admin-type work: Quick, low cognitive load
  if (
    title.includes('update') ||
    title.includes('document') ||
    title.includes('ticket') ||
    title.includes('status') ||
    title.length < 30 // Short titles often indicate admin tasks
  ) {
    return {
      type: 'admin',
      reasoning: 'Quick administrative task',
    };
  }

  // Deep work: Default for complex work items
  return {
    type: 'deep',
    reasoning: 'Requires focused attention',
  };
}
