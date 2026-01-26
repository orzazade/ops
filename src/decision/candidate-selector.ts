/**
 * Candidate selection with time-fit scoring.
 *
 * Takes scored items and applies time-of-day context to produce
 * final-scored candidates for recommendation generation.
 */

import type { ScoredItem } from '../triage/types.js';
import type { TimeContext, WorkMode } from './time-context.js';
import { classifyWorkType, type WorkType } from './work-classifier.js';
import type { DecisionCandidate } from './types.js';

/**
 * Time-fit scoring matrix.
 *
 * Based on cognitive load research:
 * - Perfect match (1.0): Work type aligns with time mode
 * - Acceptable match (0.7): Work type doesn't align but doable
 * - Severe mismatch (0.5): Deep work during meeting/admin time
 */
const TIME_FIT_MATRIX: Record<WorkMode, Record<WorkType, number>> = {
  deep: {
    deep: 1.0, // Perfect: Deep work during peak focus
    admin: 0.7, // OK: Admin tasks during deep time (not optimal but doable)
    meeting: 0.7, // OK: Meeting work during deep time
  },
  meeting: {
    meeting: 1.0, // Perfect: Collaboration during meeting time
    admin: 0.7, // OK: Admin during meeting time
    deep: 0.5, // Severe mismatch: Deep work during meeting time
  },
  admin: {
    admin: 1.0, // Perfect: Admin during admin time
    meeting: 0.7, // OK: Meeting work during admin time
    deep: 0.5, // Severe mismatch: Deep work during admin time
  },
  'after-hours': {
    // After-hours is flexible - all work types are acceptable
    deep: 0.7, // OK: Can do deep work if energy permits
    admin: 1.0, // Good: Admin tasks are easy after-hours
    meeting: 0.5, // Difficult: Meetings after-hours require coordination
  },
};

/**
 * Calculate time-fit score for work type and time mode.
 *
 * @param workType - Classified work type (deep/admin/meeting)
 * @param timeMode - Current time mode (deep/admin/meeting/after-hours)
 * @returns Time-fit multiplier (0.5-1.0)
 */
export function calculateTimeFit(workType: WorkType, timeMode: WorkMode): number {
  return TIME_FIT_MATRIX[timeMode][workType];
}

/**
 * Select top candidates with time-fit scoring.
 *
 * Process:
 * 1. Take top 10 by priority score
 * 2. Classify each item's work type
 * 3. Apply time-fit multiplier to get final score
 * 4. Sort by final score descending
 *
 * @param scoredItems - Items with priority scores (sorted by score descending)
 * @param timeContext - Current time context with work mode
 * @returns Candidates array sorted by final score descending
 */
export function selectCandidates(
  scoredItems: ScoredItem[],
  timeContext: TimeContext
): DecisionCandidate[] {
  // Take top 10 by priority score
  const topItems = scoredItems.slice(0, 10);

  // Classify and apply time-fit scoring
  const candidates: DecisionCandidate[] = topItems.map((scored) => {
    const workType = classifyWorkType(scored);
    const timeFit = calculateTimeFit(workType.type, timeContext.mode);
    const finalScore = scored.score * timeFit;

    return {
      scored,
      workType,
      timeFit,
      finalScore,
    };
  });

  // Sort by final score descending
  candidates.sort((a, b) => b.finalScore - a.finalScore);

  return candidates;
}
