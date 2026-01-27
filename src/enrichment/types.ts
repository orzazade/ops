/**
 * Enrichment types for work items and GSD projects.
 *
 * This module defines types for enriching work items with full descriptions,
 * comments, and metadata to provide Claude with context for decision-making.
 */

/**
 * Azure DevOps comment with metadata.
 */
export interface ADOComment {
  id: number;
  text: string;
  createdDate: string;
  createdBy: string;
}

/**
 * Enriched work item relation with title.
 */
export interface EnrichedRelation {
  id: number;
  title: string;
  type: 'parent' | 'child' | 'blocker' | 'blocked-by' | 'related';
}

/**
 * Enriched Azure DevOps work item with full context.
 * Includes description, comments, and related item details.
 */
export interface EnrichedWorkItem {
  id: number;
  title: string;
  description: string | null;
  comments: ADOComment[];
  dueDate: string | null;
  sprintPath: string | null;
  tags: string[];
  areaPath: string;
  relations: EnrichedRelation[];
}

/**
 * Enriched GSD project item with goal and status.
 * Includes PLAN.md goal description and SUMMARY.md details.
 */
export interface EnrichedGSDItem {
  path: string;
  name: string;
  goalDescription: string | null;
  summary: string | null;
  currentPhase: string | null;
  status: string | null;
}

/**
 * Enrichment item type discriminant.
 */
export type EnrichmentItemType = 'work_item' | 'gsd_item';

/**
 * Enrichment result with token tracking and error handling.
 * Contains enriched items and metadata about the enrichment process.
 */
export interface EnrichmentResult {
  items: (EnrichedWorkItem | EnrichedGSDItem)[];
  totalTokens: number;
  truncated: boolean;
  errors: string[];
}

/**
 * Type guard for EnrichedWorkItem.
 */
export function isEnrichedWorkItem(
  item: EnrichedWorkItem | EnrichedGSDItem
): item is EnrichedWorkItem {
  return 'id' in item && typeof item.id === 'number';
}

/**
 * Type guard for EnrichedGSDItem.
 */
export function isEnrichedGSDItem(
  item: EnrichedWorkItem | EnrichedGSDItem
): item is EnrichedGSDItem {
  return 'path' in item && typeof item.path === 'string';
}
