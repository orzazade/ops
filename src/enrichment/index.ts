/**
 * Enrichment module exports.
 *
 * This module provides the main enrichment orchestrator and supporting
 * utilities for enriching work items and GSD projects with full context.
 */

// Main orchestrator
export { Enricher } from './enricher.js';

// Enrichers
export { ADOEnricher } from './ado-enricher.js';
export { GSDEnricher } from './gsd-enricher.js';

// Cache
export { EnrichmentCache } from './cache.js';
export type { CacheStats } from './cache.js';

// Types
export type {
  EnrichedWorkItem,
  EnrichedGSDItem,
  ADOComment,
  EnrichedRelation,
  EnrichmentResult,
  EnrichmentItemType,
} from './types.js';
export { isEnrichedWorkItem, isEnrichedGSDItem } from './types.js';

// Token utilities
export {
  estimateTokens,
  truncateToTokenBudget,
  truncateComments,
} from './token-counter.js';
