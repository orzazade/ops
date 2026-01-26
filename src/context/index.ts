/**
 * Context Engine Module
 *
 * Provides types and utilities for building optimized LLM context from researcher data.
 *
 * @module context
 */

// Export all types
export type {
  CompressedWorkItem,
  CompressedPR,
  CompressedProject,
  ContextSection,
  ContextStats,
} from './types.js';

// Export utility functions
export { escapeXml, truncateText } from './utils.js';

// Export compression functions
export {
  compressWorkItem,
  compressPR,
  compressProject,
  summarizeReviewers,
} from './compression.js';

// Export token budget management
export { TokenBudget, OverflowError, type Allocation } from './token-budget.js';
