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

/**
 * Schema for a single pin.
 * Represents a briefing item the user wants to keep in focus.
 */
export const PinSchema = z.object({
  /**
   * Work item ID or PR ID (both ADO items use numeric IDs).
   */
  id: z.number(),

  /**
   * Type discriminant for the item.
   */
  type: z.enum(['work_item', 'pull_request']),

  /**
   * Title of the work item or pull request (cached for display).
   */
  title: z.string(),

  /**
   * ISO timestamp when the item was pinned.
   */
  pinned_at: z.string(),
});

/**
 * Schema for the pins file stored at ~/.ops/pins.json.
 * Contains all currently pinned items.
 */
export const PinsFileSchema = z.object({
  /**
   * Version of the pins file format.
   */
  version: z.literal(1),

  /**
   * Array of pinned items.
   */
  pins: z.array(PinSchema),
});

/**
 * Schema for a single priority change between morning and current briefing.
 * Represents how an item's priority changed during the day.
 */
export const PriorityChangeSchema = z.object({
  /**
   * Work item ID or PR ID.
   */
  id: z.number(),

  /**
   * Type discriminant for the item.
   */
  type: z.enum(['work_item', 'pull_request']),

  /**
   * Title of the work item or pull request.
   */
  title: z.string(),

  /**
   * Change type: added (new), removed (completed), changed (priority reason changed), unchanged.
   */
  change_type: z.enum(['added', 'removed', 'changed', 'unchanged']),

  /**
   * Morning priority reason (if item existed in morning briefing).
   */
  morning_reason: z.string().optional(),

  /**
   * Current priority reason (if item exists in current briefing).
   */
  current_reason: z.string().optional(),
});

/**
 * Schema for the complete delta between morning and current briefing.
 * Contains all changes identified during delta calculation.
 */
export const PriorityDeltaSchema = z.object({
  /**
   * Items that appeared in current briefing but not morning briefing.
   */
  added: z.array(PriorityChangeSchema),

  /**
   * Items that appeared in morning briefing but not current briefing.
   */
  removed: z.array(PriorityChangeSchema),

  /**
   * Items that appeared in both but with different priority reasons.
   */
  changed: z.array(PriorityChangeSchema),

  /**
   * Items that appeared in both with the same priority reason.
   */
  unchanged: z.array(PriorityChangeSchema),
});

/**
 * Inferred TypeScript type for a pin.
 */
export type Pin = z.infer<typeof PinSchema>;

/**
 * Inferred TypeScript type for the pins file.
 */
export type PinsFile = z.infer<typeof PinsFileSchema>;

/**
 * Inferred TypeScript type for a priority change.
 */
export type PriorityChange = z.infer<typeof PriorityChangeSchema>;

/**
 * Inferred TypeScript type for a priority delta.
 */
export type PriorityDelta = z.infer<typeof PriorityDeltaSchema>;

/**
 * Schema for a single override (boost or demote).
 */
export const OverrideSchema = z.object({
  id: z.number(),
  type: z.enum(['work_item', 'pull_request']),
  amount: z.number(), // positive for boost, negative for demote
  expires_at: z.string(), // ISO timestamp
  created_at: z.string(),
});

/**
 * Schema for the overrides file at ~/.ops/overrides.json.
 */
export const OverridesFileSchema = z.object({
  version: z.literal(1),
  overrides: z.array(OverrideSchema),
});

export type Override = z.infer<typeof OverrideSchema>;
export type OverridesFile = z.infer<typeof OverridesFileSchema>;

/**
 * Schema for custom rules file at ~/.ops/rules.json.
 */
export const CustomRulesSchema = z.object({
  priorities: z.record(z.string(), z.number()),
  updated_at: z.string(),
});

export type CustomRules = z.infer<typeof CustomRulesSchema>;
