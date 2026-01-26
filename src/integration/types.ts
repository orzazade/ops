/**
 * Types for integration module.
 * Used by carryover logic and history persistence.
 */

import type { BriefingItem } from '../triage/schemas.js';

/**
 * Result of comparing today's items with yesterday's briefing.
 * Partitions items into carryover (from yesterday) and new (not in yesterday).
 */
export interface CarryoverResult {
  /**
   * Items that were also in yesterday's briefing.
   */
  carryover: BriefingItem[];

  /**
   * Items that were not in yesterday's briefing.
   */
  new: BriefingItem[];
}
