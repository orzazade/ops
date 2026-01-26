/**
 * First action suggestion for work items.
 *
 * Provides concrete next step based on item type and title
 * to help users overcome activation energy and get started.
 */

import type { ScoredItem } from '../triage/types.js';

/**
 * Generate first action suggestion for a work item.
 *
 * Suggestions based on item type and title keywords:
 * - PRs: Review diff and run tests
 * - Bugs: Reproduce the issue
 * - Implement/add: Review requirements and create design
 * - Update/document: Open file and review current state
 * - Fallback: Read full ticket description
 *
 * @param item - Scored item to generate action for
 * @returns Concrete first action suggestion
 */
export function generateFirstAction(item: ScoredItem): string {
  const { item: scoreableItem } = item;
  const type = scoreableItem.type;
  const title = scoreableItem.item.title.toLowerCase();

  // Pull request: Review diff and test
  if (type === 'pull_request') {
    return 'Start by reviewing the PR diff and running tests locally';
  }

  // Bug: Reproduce locally
  if (title.includes('bug') || title.includes('fix') || title.includes('error')) {
    return 'Start by reproducing the issue locally';
  }

  // Implementation work: Design first
  if (
    title.includes('implement') ||
    title.includes('add') ||
    title.includes('create') ||
    title.includes('new')
  ) {
    return 'Start by reviewing the requirements and creating a design outline';
  }

  // Update/documentation: Review current state
  if (title.includes('update') || title.includes('document') || title.includes('refactor')) {
    return 'Start by opening the relevant file and reviewing current state';
  }

  // Fallback: Read ticket
  return 'Start by reading the full ticket description and acceptance criteria';
}
