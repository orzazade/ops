/**
 * Zod schemas for briefing output structure.
 *
 * These schemas define the structure of the daily briefing generated
 * by the triage agent, ensuring type-safe structured output from Claude.
 */

import { z } from 'zod';

/**
 * Schema for a single briefing item (work item or PR).
 * Represents one high-priority item requiring attention.
 */
export const BriefingItemSchema = z.object({
  /**
   * Work item ID or PR ID (both ADO items use numeric IDs).
   */
  id: z.number(),

  /**
   * Type discriminant for the item.
   * Note: Only ADO items are briefed - GSD projects tracked separately.
   */
  type: z.enum(['work_item', 'pull_request']),

  /**
   * Title of the work item or pull request.
   */
  title: z.string(),

  /**
   * Explanation of why this item is high priority.
   */
  priority_reason: z.string(),

  /**
   * Whether this item needs a response from the user.
   */
  needs_response: z.boolean(),

  /**
   * Suggested response draft if needs_response is true.
   * Only included when needs_response is true.
   */
  suggested_response: z.string().optional(),
});

/**
 * Schema for the complete daily briefing structure.
 * Contains top priorities, items needing response, and any blockers.
 */
export const BriefingSchema = z.object({
  /**
   * Overall briefing summary (2-3 sentences).
   * High-level overview of the day's priorities.
   */
  summary: z.string(),

  /**
   * Top 5 focus items for the day.
   * Ordered by priority (highest first).
   */
  top_priorities: z.array(BriefingItemSchema).max(5),

  /**
   * Top 3 items requiring a response.
   * Ordered by urgency (most urgent first).
   */
  needs_response: z.array(BriefingItemSchema).max(3),

  /**
   * Any risks or blockers identified.
   * Optional field for flagging issues requiring attention.
   */
  blockers: z.array(z.string()).optional(),

  /**
   * ISO timestamp when the briefing was generated.
   */
  timestamp: z.string(),
});

/**
 * Inferred TypeScript type for a briefing item.
 */
export type BriefingItem = z.infer<typeof BriefingItemSchema>;

/**
 * Inferred TypeScript type for the complete briefing.
 */
export type Briefing = z.infer<typeof BriefingSchema>;
