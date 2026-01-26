/**
 * Carryover logic for comparing today's briefing items with yesterday's.
 * Identifies which items are carried over from yesterday vs new today.
 */

import type { Briefing, BriefingItem } from '../triage/schemas.js';
import type { CarryoverResult } from './types.js';

/**
 * Identify which items are carried over from yesterday vs new today.
 * Uses Set for O(1) lookup of yesterday's item IDs.
 *
 * @param todayItems - Items from today's briefing
 * @param yesterdayBriefing - Yesterday's full briefing (optional)
 * @returns Partitioned items: carryover and new
 */
export function identifyCarryover(
  todayItems: BriefingItem[],
  yesterdayBriefing?: Briefing
): CarryoverResult {
  // If no yesterday briefing, all items are new
  if (!yesterdayBriefing) {
    return {
      carryover: [],
      new: todayItems,
    };
  }

  // Extract all IDs from yesterday's briefing (both top_priorities and needs_response)
  const yesterdayIds = new Set<number>();

  for (const item of yesterdayBriefing.top_priorities) {
    yesterdayIds.add(item.id);
  }

  for (const item of yesterdayBriefing.needs_response) {
    yesterdayIds.add(item.id);
  }

  // Partition today's items based on presence in yesterday's IDs
  const carryover: BriefingItem[] = [];
  const newItems: BriefingItem[] = [];

  for (const item of todayItems) {
    if (yesterdayIds.has(item.id)) {
      carryover.push(item);
    } else {
      newItems.push(item);
    }
  }

  return {
    carryover,
    new: newItems,
  };
}
