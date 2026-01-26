/**
 * Sprint capacity analysis and distribution algorithms
 * Implements load analysis, First-Fit Decreasing bin packing, and deferral suggestions
 */

// Minimal inline types (Plan 01 may define these in types.ts)
interface SprintItem {
  id: string;
  title: string;
  priority: 'P1' | 'P2' | 'P3';
  storyPoints?: number;
  createdDate: Date;
}

interface LoadAnalysis {
  currentCapacity: number;
  maxCapacity: number;
  utilizationPercent: number;
  isOverCommitted: boolean;
  excessPoints: number;
  suggestions: DeferralSuggestion[];
}

interface DeferralSuggestion {
  itemId: string;
  reason: string;
}

interface DistributionResult {
  assignments: Map<string, string>;
  sprints: Sprint[];
}

interface Sprint {
  name: string;
  items: SprintItem[];
  totalPoints: number;
}

const DEFAULT_STORY_POINTS = 3;
const OVER_COMMITMENT_THRESHOLD = 120; // percent

/**
 * Analyze sprint load and determine if over-committed
 *
 * @param items - Sprint items to analyze
 * @param capacityPoints - Maximum sprint capacity
 * @returns Load analysis with utilization and deferral suggestions
 */
export function analyzeLoad(items: SprintItem[], capacityPoints: number): LoadAnalysis {
  const currentCapacity = items.reduce((sum, item) => {
    return sum + (item.storyPoints ?? DEFAULT_STORY_POINTS);
  }, 0);

  const utilizationPercent = capacityPoints === 0 ? 0 : Math.round((currentCapacity / capacityPoints) * 100);
  const isOverCommitted = utilizationPercent > OVER_COMMITMENT_THRESHOLD;
  const excessPoints = Math.max(0, currentCapacity - capacityPoints);

  const suggestions = isOverCommitted ? suggestDeferrals(items, capacityPoints) : [];

  return {
    currentCapacity,
    maxCapacity: capacityPoints,
    utilizationPercent,
    isOverCommitted,
    excessPoints,
    suggestions,
  };
}

/**
 * Distribute items across sprints using First-Fit Decreasing bin packing
 *
 * Algorithm:
 * 1. Sort items by story points descending (largest first)
 * 2. For each item, find first sprint with available capacity
 * 3. If no sprint has room, create new sprint
 *
 * @param items - Sprint items to distribute
 * @param sprintCapacity - Capacity per sprint
 * @returns Distribution map and sprint assignments
 */
export function distributeItems(items: SprintItem[], sprintCapacity: number): DistributionResult {
  const assignments = new Map<string, string>();
  const sprints: Sprint[] = [];

  if (items.length === 0) {
    return { assignments, sprints };
  }

  // Sort by story points descending (First-Fit Decreasing)
  const sortedItems = [...items].sort((a, b) => {
    const aPoints = a.storyPoints ?? DEFAULT_STORY_POINTS;
    const bPoints = b.storyPoints ?? DEFAULT_STORY_POINTS;
    return bPoints - aPoints;
  });

  for (const item of sortedItems) {
    const itemPoints = item.storyPoints ?? DEFAULT_STORY_POINTS;

    // Find first sprint with available capacity
    let assignedSprint = sprints.find(sprint => {
      return sprint.totalPoints + itemPoints <= sprintCapacity;
    });

    // If no sprint has room, create new sprint
    if (!assignedSprint) {
      assignedSprint = {
        name: `Sprint ${sprints.length + 1}`,
        items: [],
        totalPoints: 0,
      };
      sprints.push(assignedSprint);
    }

    // Assign item to sprint
    assignedSprint.items.push(item);
    assignedSprint.totalPoints += itemPoints;
    assignments.set(item.id, assignedSprint.name);
  }

  return { assignments, sprints };
}

/**
 * Suggest items to defer when sprint is over-committed
 *
 * Selection criteria (in priority order):
 * 1. Lowest priority (P3 > P2 > P1)
 * 2. Oldest item (by createdDate)
 * 3. Largest story points
 *
 * @param items - Sprint items to analyze
 * @param capacityPoints - Maximum sprint capacity
 * @returns Ordered list of deferral suggestions
 */
export function suggestDeferrals(items: SprintItem[], capacityPoints: number): DeferralSuggestion[] {
  const currentCapacity = items.reduce((sum, item) => {
    return sum + (item.storyPoints ?? DEFAULT_STORY_POINTS);
  }, 0);

  const utilizationPercent = capacityPoints === 0 ? 0 : (currentCapacity / capacityPoints) * 100;

  // Only suggest deferrals if over-committed (>120%)
  if (utilizationPercent <= OVER_COMMITMENT_THRESHOLD) {
    return [];
  }

  const excessPoints = currentCapacity - capacityPoints;

  // Priority order: P3 = 3, P2 = 2, P1 = 1 (higher value = lower priority)
  const priorityOrder: Record<string, number> = { P3: 3, P2: 2, P1: 1 };

  // Sort by: lowest priority first, then oldest, then largest
  const sortedItems = [...items].sort((a, b) => {
    // Sort by priority (lowest priority first)
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Sort by age (oldest first)
    const ageDiff = a.createdDate.getTime() - b.createdDate.getTime();
    if (ageDiff !== 0) return ageDiff;

    // Sort by size (largest first)
    const aPoints = a.storyPoints ?? DEFAULT_STORY_POINTS;
    const bPoints = b.storyPoints ?? DEFAULT_STORY_POINTS;
    return bPoints - aPoints;
  });

  // Select items until we cover excess points
  const suggestions: DeferralSuggestion[] = [];
  let pointsCovered = 0;

  for (const item of sortedItems) {
    if (pointsCovered >= excessPoints) break;

    const itemPoints = item.storyPoints ?? DEFAULT_STORY_POINTS;
    const reason = generateDeferralReason(item);

    suggestions.push({
      itemId: item.id,
      reason,
    });

    pointsCovered += itemPoints;
  }

  return suggestions;
}

/**
 * Generate human-readable reason for deferral suggestion
 */
function generateDeferralReason(item: SprintItem): string {
  const reasons: string[] = [];

  // Priority reason
  if (item.priority === 'P3') {
    reasons.push('Lowest priority (P3)');
  } else if (item.priority === 'P2') {
    reasons.push('Lower priority (P2)');
  }

  // Age reason
  const ageInDays = Math.floor((Date.now() - item.createdDate.getTime()) / (1000 * 60 * 60 * 24));
  if (ageInDays > 30) {
    reasons.push(`Oldest item (${ageInDays}d)`);
  }

  // Size reason
  const itemPoints = item.storyPoints ?? DEFAULT_STORY_POINTS;
  if (itemPoints >= 8) {
    reasons.push(`Large item (${itemPoints} points)`);
  }

  return reasons.join(', ') || 'Defer to balance capacity';
}
