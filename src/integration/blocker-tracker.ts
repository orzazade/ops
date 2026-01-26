/**
 * Blocker tracker for EOD summary.
 *
 * Tracks blocker age across days by comparing against yesterday's EOD.
 * Provides escalation suggestions based on age.
 */

import { loadYesterdayEOD } from './eod-history.js';
import type { BriefingItem } from '../triage/schemas.js';
import type { BlockerWithAge, EODSummary } from './eod-types.js';

/**
 * Calculate blocker age by comparing against yesterday's EOD.
 *
 * Uses Set-based O(1) lookups for performance.
 *
 * @param currentBlockers - Items currently in blocked state
 * @returns Blockers with age information and suggested actions
 */
export async function calculateBlockerAge(
  currentBlockers: BriefingItem[]
): Promise<BlockerWithAge[]> {
  // Load yesterday's EOD for age comparison
  const yesterdayEOD = await loadYesterdayEOD();

  return calculateBlockerAgeWithYesterday(currentBlockers, yesterdayEOD);
}

/**
 * Pure function for blocker age calculation (testable without async).
 */
export function calculateBlockerAgeWithYesterday(
  currentBlockers: BriefingItem[],
  yesterdayEOD?: EODSummary
): BlockerWithAge[] {
  if (!yesterdayEOD) {
    // No yesterday EOD - all blockers are new (day 1)
    return currentBlockers.map(blocker => ({
      item: blocker,
      blockedSince: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      daysBlocked: 1,
      suggestedAction: suggestUnblockAction(blocker, 1),
    }));
  }

  // Build Set for O(1) lookup of yesterday's blockers
  const yesterdayBlockerMap = new Map<string, BlockerWithAge>();
  for (const blocker of yesterdayEOD.blockers) {
    const key = `${blocker.item.type}:${blocker.item.id}`;
    yesterdayBlockerMap.set(key, blocker);
  }

  return currentBlockers.map(blocker => {
    const key = `${blocker.type}:${blocker.id}`;
    const yesterdayBlocker = yesterdayBlockerMap.get(key);

    if (yesterdayBlocker) {
      // Blocker persisted from yesterday - increment age
      const daysBlocked = yesterdayBlocker.daysBlocked + 1;
      return {
        item: blocker,
        blockedSince: yesterdayBlocker.blockedSince,
        daysBlocked,
        previousReason: yesterdayBlocker.item.priority_reason !== blocker.priority_reason
          ? yesterdayBlocker.item.priority_reason
          : undefined,
        suggestedAction: suggestUnblockAction(blocker, daysBlocked),
      };
    } else {
      // New blocker (wasn't blocked yesterday)
      return {
        item: blocker,
        blockedSince: new Date().toISOString().split('T')[0],
        daysBlocked: 1,
        suggestedAction: suggestUnblockAction(blocker, 1),
      };
    }
  });
}

/**
 * Suggest an unblock action based on blocker age and context.
 */
function suggestUnblockAction(blocker: BriefingItem, daysBlocked: number): string {
  // Escalation threshold at 3 days
  if (daysBlocked >= 3) {
    return `Blocked for ${daysBlocked} days - consider escalating to PM or team lead`;
  }

  if (daysBlocked === 2) {
    return 'Blocked for 2 days - follow up with stakeholders today';
  }

  // Day 1 - standard suggestion
  return 'Identify blocker owner and reach out';
}
