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
