/**
 * Zod schemas for EOD (End-of-Day) summary structure.
 *
 * These schemas define the structure of the daily end-of-day summary,
 * capturing accomplishments, blockers with age tracking, and carryover
 * items with inferred reasons.
 */

import { z } from 'zod';
import { BriefingItemSchema } from '../triage/schemas.js';

/**
 * Schema for a blocker item with age tracking.
 * Represents a blocked item with history and suggested actions.
 */
export const BlockerWithAgeSchema = z.object({
  /**
   * The briefing item that is blocked.
   */
  item: BriefingItemSchema,

  /**
   * ISO date (YYYY-MM-DD) when this item first became blocked.
   */
  blockedSince: z.string(),

  /**
   * Number of days this item has been blocked.
   * Calculated from yesterday's EOD or set to 1 if first time blocked.
   */
  daysBlocked: z.number(),

  /**
   * Previous blocker reason from yesterday (if reason changed).
   * Optional field to track blocker reason evolution.
   */
  previousReason: z.string().optional(),

  /**
   * Suggested next step to unblock this item.
   */
  suggestedAction: z.string(),
});

/**
 * Schema for a carryover item with inferred reason.
 * Represents an item that didn't get completed today with analysis.
 */
export const CarryoverWithReasonSchema = z.object({
  /**
   * The briefing item being carried over.
   */
  item: BriefingItemSchema,

  /**
   * Inferred reason for why this item is being carried over.
   */
  reason: z.enum(['blocked', 'deprioritized', 'no_time', 'partially_complete']),

  /**
   * Evidence or explanation for the inferred reason.
   */
  evidence: z.string(),

  /**
   * Suggested priority level for tomorrow's briefing.
   */
  suggestedPriority: z.enum(['high', 'medium', 'low']),
});

/**
 * Schema for GSD project progress.
 * Represents progress made on a GSD project during the day.
 */
export const GSDProgressSchema = z.object({
  /**
   * Name of the GSD project.
   */
  projectName: z.string(),

  /**
   * Percentage change in project progress (0-100).
   * Calculated from phases completed.
   */
  progressDelta: z.number(),

  /**
   * Number of new phases completed today.
   */
  newPhasesCompleted: z.number(),

  /**
   * Current phase being worked on (optional).
   */
  currentPhase: z.string().optional(),
});

/**
 * Schema for all accomplishments in the day.
 * Contains completed items, progressed items, and GSD project progress.
 */
export const AccomplishmentsSchema = z.object({
  /**
   * Items from morning briefing that are now completed.
   */
  completed: z.array(BriefingItemSchema),

  /**
   * Items with activity but not yet complete.
   */
  progressed: z.array(BriefingItemSchema),

  /**
   * Progress made on GSD projects.
   */
  gsdProgress: z.array(GSDProgressSchema),
});

/**
 * Schema for the complete EOD summary structure.
 * Contains all accomplishments, blockers with age, and carryover items.
 */
export const EODSummarySchema = z.object({
  /**
   * ISO date (YYYY-MM-DD) for this EOD summary.
   */
  date: z.string(),

  /**
   * All accomplishments for the day.
   */
  accomplishments: AccomplishmentsSchema,

  /**
   * Current blockers with age tracking.
   */
  blockers: z.array(BlockerWithAgeSchema),

  /**
   * Items being carried over to tomorrow with reasons.
   */
  carryover: z.array(CarryoverWithReasonSchema),

  /**
   * ISO timestamp when this EOD summary was generated.
   */
  timestamp: z.string(),

  /**
   * ISO timestamp of the morning briefing used as baseline.
   * Optional field for reference back to the morning context.
   */
  morningBriefingTimestamp: z.string().optional(),
});

/**
 * Inferred TypeScript type for a blocker with age.
 */
export type BlockerWithAge = z.infer<typeof BlockerWithAgeSchema>;

/**
 * Inferred TypeScript type for a carryover item with reason.
 */
export type CarryoverWithReason = z.infer<typeof CarryoverWithReasonSchema>;

/**
 * Inferred TypeScript type for GSD project progress.
 */
export type GSDProgress = z.infer<typeof GSDProgressSchema>;

/**
 * Inferred TypeScript type for accomplishments.
 */
export type Accomplishments = z.infer<typeof AccomplishmentsSchema>;

/**
 * Inferred TypeScript type for the complete EOD summary.
 */
export type EODSummary = z.infer<typeof EODSummarySchema>;
