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

/**
 * Schema for a single response option.
 * Represents one approach to responding to a briefing item.
 */
export const ResponseOptionSchema = z.object({
  /**
   * Short descriptive label for this option.
   * Example: "Detailed", "Brief", "Action-focused"
   */
  label: z.string(),

  /**
   * Tone level for this response option.
   * Formal for VIP communication, casual for peers.
   */
  tone: z.enum(['formal', 'balanced', 'casual']),

  /**
   * Complete response text, ready to send.
   * This is the full message that can be copied/sent directly.
   */
  text: z.string(),

  /**
   * Explanation of why this approach works for the situation.
   * Helps the user understand the rationale behind this option.
   */
  rationale: z.string(),
});

/**
 * Schema for the complete response draft output.
 * Contains multiple response options and context notes.
 */
export const ResponseDraftSchema = z.object({
  /**
   * Summary of the situation requiring response.
   * Brief (1-2 sentences) overview of the context.
   */
  summary: z.string(),

  /**
   * Response options with different approaches.
   * Contains 2-3 distinct options for the user to choose from.
   */
  options: z.array(ResponseOptionSchema).min(2).max(3),

  /**
   * Important context factors considered during generation.
   * Examples: VIP status, urgency level, priority indicators.
   */
  context_notes: z.array(z.string()),
});

/**
 * Inferred TypeScript type for a response option.
 */
export type ResponseOption = z.infer<typeof ResponseOptionSchema>;

/**
 * Inferred TypeScript type for a response draft.
 */
export type ResponseDraft = z.infer<typeof ResponseDraftSchema>;
