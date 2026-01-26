/**
 * Delta calculator for comparing morning and current briefings.
 *
 * Uses Map-based O(1) lookups for performance when identifying
 * new, completed, and changed priority items.
 */

import type { BriefingItem, PriorityChange, PriorityDelta } from '../triage/schemas.js';

/**
 * Creates a unique key for a briefing item.
 */
function itemKey(item: BriefingItem): string {
  return `${item.type}:${item.id}`;
}

/**
 * Calculates the delta between morning and current briefings.
 *
 * Uses Map-based O(1) lookups for performance:
 * - O(n) to build morning map
 * - O(m) to process current items
 * - O(n) to process remaining morning items
 * - Total: O(n + m) vs O(n * m) for nested loops
 *
 * @param morning - Items from the morning briefing
 * @param current - Items from the current briefing
 * @returns Delta with added, removed, changed, unchanged items
 */
export function calculateDelta(
  morning: BriefingItem[],
  current: BriefingItem[]
): PriorityDelta {
  const delta: PriorityDelta = {
    added: [],
    removed: [],
    changed: [],
    unchanged: [],
  };

  // Build map of morning items for O(1) lookups
  const morningMap = new Map<string, BriefingItem>();
  for (const item of morning) {
    morningMap.set(itemKey(item), item);
  }

  // Process current items: detect added/changed/unchanged
  const processedKeys = new Set<string>();
  for (const currentItem of current) {
    const key = itemKey(currentItem);
    processedKeys.add(key);

    const morningItem = morningMap.get(key);

    if (!morningItem) {
      // Item is new in current briefing
      delta.added.push({
        id: currentItem.id,
        type: currentItem.type,
        title: currentItem.title,
        change_type: 'added',
        current_reason: currentItem.priority_reason,
      });
    } else if (morningItem.priority_reason !== currentItem.priority_reason) {
      // Item exists in both but priority reason changed
      delta.changed.push({
        id: currentItem.id,
        type: currentItem.type,
        title: currentItem.title,
        change_type: 'changed',
        morning_reason: morningItem.priority_reason,
        current_reason: currentItem.priority_reason,
      });
    } else {
      // Item exists in both with same priority reason
      delta.unchanged.push({
        id: currentItem.id,
        type: currentItem.type,
        title: currentItem.title,
        change_type: 'unchanged',
        morning_reason: morningItem.priority_reason,
        current_reason: currentItem.priority_reason,
      });
    }
  }

  // Process morning items that weren't in current: detect removed
  for (const morningItem of morning) {
    const key = itemKey(morningItem);
    if (!processedKeys.has(key)) {
      // Item was in morning but not in current (completed/deprioritized)
      delta.removed.push({
        id: morningItem.id,
        type: morningItem.type,
        title: morningItem.title,
        change_type: 'removed',
        morning_reason: morningItem.priority_reason,
      });
    }
  }

  return delta;
}
