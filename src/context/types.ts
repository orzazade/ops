/**
 * Compressed data types and context stats interfaces for the context engine.
 *
 * This module provides slimmed-down versions of researcher data types,
 * optimized for LLM context windows by dropping low-value fields and
 * enabling text truncation.
 */

/**
 * Compressed work item optimized for context windows.
 *
 * Drops: createdDate, changedDate, sprintPath, blockedBy, blocks
 * Keeps: Essential fields for briefing (id, title, state, priority, assignment)
 * Optional: tags (only if non-empty), assignedTo
 */
export interface CompressedWorkItem {
  id: number;
  title: string; // Will be truncated during XML generation
  state: string;
  priority: number;
  assignedTo?: string;
  tags?: string[]; // Only include if non-empty
}

/**
 * Compressed pull request optimized for context windows.
 *
 * Drops: createdDate, targetBranch, full reviewer details
 * Keeps: Essential fields for review status (id, title, author, status)
 * Repository: simplified to just repo name (not full path)
 * ReviewerSummary: e.g., "2/3 approved"
 */
export interface CompressedPR {
  id: number;
  title: string; // Will be truncated during XML generation
  author: string;
  status: string;
  repository: string; // Just repo name, not full path
  reviewerSummary: string; // e.g., "2/3 approved"
}

/**
 * Compressed project optimized for context windows.
 *
 * Drops: path, milestone, progress
 * Keeps: Essential fields for current state (name, phase, status)
 * RemainingTasks: limited to top 3
 * Blockers: kept (critical info)
 */
export interface CompressedProject {
  name: string;
  currentPhase?: string;
  status?: string;
  remainingTasks?: string[]; // Limit to 3 items
  blockers?: string[];
}

/**
 * Context section with priority and token tracking.
 *
 * Represents a single section of the assembled context (e.g., work_items, pull_requests).
 * Priority used for overflow handling: higher priority sections kept when budget exceeded.
 * Tokens set after counting (optional until counted).
 */
export interface ContextSection {
  name: string;
  content: string;
  priority: number;
  tokens?: number; // Set after token counting
}

/**
 * Context statistics for budget tracking and debugging.
 *
 * Provides visibility into token usage across sections:
 * - totalTokens: sum of all section tokens
 * - remainingTokens: budget - totalTokens
 * - sectionCount: number of sections included
 * - sections: per-section breakdown (name, tokens, priority)
 */
export interface ContextStats {
  totalTokens: number;
  remainingTokens: number;
  sectionCount: number;
  sections: Array<{
    name: string;
    tokens: number;
    priority: number;
  }>;
}
