/**
 * Carryover analyzer for EOD summary.
 *
 * Identifies items from morning briefing that weren't completed
 * and infers why they didn't get done.
 */

import type { BriefingItem, Briefing } from '../triage/schemas.js';
import type { CarryoverWithReason, BlockerWithAge } from './eod-types.js';

export type CarryoverReason = 'blocked' | 'deprioritized' | 'no_time' | 'partially_complete';

export interface CarryoverInput {
  morningBriefing: Briefing;
  currentItems: BriefingItem[];
  completedItems: BriefingItem[];  // From accomplishment tracker
  progressedItems: BriefingItem[];  // Items with activity but not done
  blockers: BlockerWithAge[];  // Current blockers
}

/**
 * Analyze carryover items and infer reasons.
 *
 * @param input - Morning briefing and current state data
 * @returns Carryover items with inferred reasons and suggested priorities
 */
export function analyzeCarryover(input: CarryoverInput): CarryoverWithReason[] {
  const { morningBriefing, completedItems, progressedItems, blockers } = input;

  // Build Sets for O(1) lookups
  const completedIds = new Set(completedItems.map(i => `${i.type}:${i.id}`));
  const progressedIds = new Set(progressedItems.map(i => `${i.type}:${i.id}`));
  const blockedIds = new Set(blockers.map(b => `${b.item.type}:${b.item.id}`));

  // Get all morning items
  const morningItems = [...morningBriefing.top_priorities, ...morningBriefing.needs_response];

  // Filter to items that weren't completed
  const incompleteItems = morningItems.filter(item => {
    const key = `${item.type}:${item.id}`;
    return !completedIds.has(key);
  });

  // Infer reason for each incomplete item
  return incompleteItems.map(item => {
    const key = `${item.type}:${item.id}`;

    // Check if now blocked
    if (blockedIds.has(key)) {
      const blocker = blockers.find(b => `${b.item.type}:${b.item.id}` === key);
      return {
        item,
        reason: 'blocked' as CarryoverReason,
        evidence: `Item is currently blocked (${blocker?.daysBlocked ?? 1} day${(blocker?.daysBlocked ?? 1) > 1 ? 's' : ''})`,
        suggestedPriority: 'high' as const,  // Blocked items try first tomorrow (assuming unblocked)
      };
    }

    // Check if had activity (partially complete)
    if (progressedIds.has(key)) {
      return {
        item,
        reason: 'partially_complete' as CarryoverReason,
        evidence: 'Item has updates today but not completed',
        suggestedPriority: 'high' as const,  // Continue momentum
      };
    }

    // Check if deprioritized (not in current top priorities)
    const inCurrentPriorities = input.currentItems.some(
      ci => ci.id === item.id && ci.type === item.type
    );
    if (!inCurrentPriorities) {
      return {
        item,
        reason: 'deprioritized' as CarryoverReason,
        evidence: 'No longer in top priorities',
        suggestedPriority: 'low' as const,  // May have been intentionally deprioritized
      };
    }

    // Default: no time (still in priorities but no activity)
    return {
      item,
      reason: 'no_time' as CarryoverReason,
      evidence: 'No activity detected today',
      suggestedPriority: 'medium' as const,
    };
  });
}
