/**
 * Accomplishment tracker for EOD summary.
 *
 * Uses delta-based detection comparing morning briefing against current state
 * to identify completed, progressed, and GSD accomplishments.
 */

import { calculateDelta } from './delta-calculator.js';
import type { BriefingItem, Briefing } from '../triage/schemas.js';
import type { GSDProject } from '../researchers/types.js';
import type { GSDProgress } from './eod-types.js';

export interface AccomplishmentInput {
  morningBriefing: Briefing;
  currentItems: BriefingItem[];
  morningGSD: GSDProject[];
  currentGSD: GSDProject[];
}

export interface AccomplishmentResult {
  completed: BriefingItem[];
  progressed: BriefingItem[];
  gsdProgress: GSDProgress[];
}

/**
 * Detect accomplishments by comparing morning and current state.
 *
 * Uses O(n+m) Map-based delta calculation for performance.
 *
 * @param input - Morning baseline and current state data
 * @returns Accomplishments categorized as completed, progressed, or GSD progress
 */
export function detectAccomplishments(input: AccomplishmentInput): AccomplishmentResult {
  // 1. Calculate delta between morning and current ADO items
  const morningItems = [...input.morningBriefing.top_priorities, ...input.morningBriefing.needs_response];
  const delta = calculateDelta(morningItems, input.currentItems);

  // Items removed from priorities = likely completed
  const completed: BriefingItem[] = delta.removed.map(change => {
    const morningItem = morningItems.find(
      item => item.id === change.id && item.type === change.type
    );
    return morningItem!;
  }).filter(Boolean);

  // Items with changed reason = progressed (had activity but not done)
  const progressed: BriefingItem[] = delta.changed.map(change => {
    const currentItem = input.currentItems.find(
      item => item.id === change.id && item.type === change.type
    );
    return currentItem!;
  }).filter(Boolean);

  // 2. Detect GSD progress
  const gsdProgress = detectGSDProgress(input.morningGSD, input.currentGSD);

  return { completed, progressed, gsdProgress };
}

/**
 * Detect GSD progress by comparing morning and current project states.
 * Uses Map-based O(1) lookups for performance.
 */
function detectGSDProgress(
  morningGSD: GSDProject[],
  currentGSD: GSDProject[]
): GSDProgress[] {
  const progress: GSDProgress[] = [];

  // Build map of morning states for O(1) lookup
  const morningMap = new Map<string, GSDProject>();
  for (const project of morningGSD) {
    morningMap.set(project.name, project);
  }

  // Compare current against morning
  for (const current of currentGSD) {
    const morning = morningMap.get(current.name);

    if (!morning) {
      // New project - not an accomplishment (discovered today)
      continue;
    }

    // Calculate progress delta using the progress percentage field
    const morningProgress = morning.progress ?? 0;
    const currentProgress = current.progress ?? 0;
    const progressDelta = currentProgress - morningProgress;

    // Detect phase changes by comparing currentPhase strings
    // (completedPhases field doesn't exist - use phase name comparison)
    const phaseChanged = current.currentPhase !== morning.currentPhase;
    const newPhasesCompleted = phaseChanged ? 1 : 0;  // Simplified: 1 if phase changed, 0 otherwise

    if (progressDelta > 0 || phaseChanged) {
      progress.push({
        projectName: current.name,
        progressDelta,
        newPhasesCompleted,
        currentPhase: current.currentPhase,
      });
    }
  }

  return progress;
}
