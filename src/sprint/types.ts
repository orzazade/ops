/**
 * Sprint intelligence types.
 * Defines work item structure, capacity state, and distribution results.
 */

/**
 * A work item in the sprint context with story points and metadata.
 */
export interface SprintItem {
  id: number;
  title: string;
  type: 'Bug' | 'Task' | 'User Story' | 'Feature' | string;
  state: string;
  priority: number | null;  // 1-4, null if unset
  storyPoints: number;      // Default to 3 if unset (per CONTEXT.md)
  assignedTo: string | null;
  createdDate: string;      // ISO 8601
  iterationPath: string;
  tags: string[];
  age: number;              // Days since created
}

/**
 * Current sprint capacity state.
 */
export interface SprintState {
  name: string;
  iterationPath: string;    // Full ADO path e.g. "Project\\Sprint 214"
  startDate: string;
  endDate: string;
  capacity: number;         // From config
  used: number;             // Sum of story points
  items: SprintItem[];
  isOverCommitted: boolean; // used > capacity * 1.2
}

/**
 * Future sprint for distribution.
 */
export interface FutureSprint {
  name: string;
  iterationPath: string;
  capacity: number;
  used: number;             // Existing items' story points
  available: number;        // capacity - used
}

/**
 * Result of distributing items across sprints.
 */
export interface DistributionResult {
  assignments: Map<number, string>;  // itemId -> iterationPath
  sprints: Array<{
    name: string;
    iterationPath: string;
    items: SprintItem[];
    totalPoints: number;
    capacityPercent: number;
  }>;
}

/**
 * A suggestion to defer an item from current sprint.
 */
export interface DeferralSuggestion {
  item: SprintItem;
  reason: string;           // e.g., "Lowest priority (P3)", "Oldest item (45 days)"
  targetSprint: string;     // Suggested destination iteration path
}

/**
 * Result of sprint load analysis.
 */
export interface LoadAnalysis {
  currentCapacity: number;
  maxCapacity: number;
  utilizationPercent: number;
  isOverCommitted: boolean;
  excessPoints: number;     // Points over 100% capacity (not 120%)
  suggestions: DeferralSuggestion[];
}
