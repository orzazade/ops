/**
 * Main enrichment orchestrator.
 *
 * The Enricher is the public API for enrichment. It takes scored items,
 * selects top N, enriches them via appropriate enrichers, enforces token
 * budget, and caches results.
 */

import { ADOEnricher } from './ado-enricher.js';
import { GSDEnricher } from './gsd-enricher.js';
import { EnrichmentCache } from './cache.js';
import { estimateTokens, truncateComments, truncateToTokenBudget } from './token-counter.js';
import type { ScoredItem } from '../triage/types.js';
import type { OpsConfig } from '../config/schema.js';
import type { EnrichmentResult, EnrichedWorkItem, EnrichedGSDItem } from './types.js';

/**
 * Main enrichment orchestrator.
 * Coordinates enrichment pipeline with caching and token budget enforcement.
 */
export class Enricher {
  private cache: EnrichmentCache;

  constructor(
    private adoEnricher: ADOEnricher,
    private gsdEnricher: GSDEnricher
  ) {
    this.cache = new EnrichmentCache();
  }

  /**
   * Enrich top N items from scored list.
   *
   * @param scoredItems - Items sorted by score (highest first)
   * @param config - Ops configuration
   * @returns Enrichment result with items, token count, and metadata
   */
  async enrichTopItems(
    scoredItems: ScoredItem[],
    config: OpsConfig
  ): Promise<EnrichmentResult> {
    const errors: string[] = [];
    const items: (EnrichedWorkItem | EnrichedGSDItem)[] = [];

    // Handle empty input
    if (scoredItems.length === 0) {
      return {
        items: [],
        totalTokens: 0,
        truncated: false,
        errors: [],
      };
    }

    // Select top N items
    const topCount = config.enrichment.count;
    const topItems = scoredItems.slice(0, topCount);

    // Enrich each item
    for (const scoredItem of topItems) {
      try {
        const enrichedItem = await this.enrichItem(scoredItem);
        if (enrichedItem) {
          items.push(enrichedItem);
        }
      } catch (error) {
        const errorMessage = this.buildErrorMessage(scoredItem, error);
        errors.push(errorMessage);
      }
    }

    // Calculate total tokens
    let totalTokens = this.calculateTokens(items);

    // Apply token budget truncation if needed
    const budget = 2000;
    let truncated = false;

    if (totalTokens > budget) {
      truncated = true;
      const truncatedItems = this.applyBudgetTruncation(items, budget);
      totalTokens = this.calculateTokens(truncatedItems);

      return {
        items: truncatedItems,
        totalTokens,
        truncated,
        errors,
      };
    }

    return {
      items,
      totalTokens,
      truncated,
      errors,
    };
  }

  /**
   * Enrich a single item by routing to appropriate enricher.
   *
   * @param scoredItem - Scored item to enrich
   * @returns Enriched item or null if should be skipped
   */
  private async enrichItem(
    scoredItem: ScoredItem
  ): Promise<EnrichedWorkItem | EnrichedGSDItem | null> {
    const { item } = scoredItem;

    // Route based on type
    if (item.type === 'work_item') {
      const workItem = item.item;
      const workItemId = workItem.id;

      // Check cache first (simple ID-based cache with TTL)
      // Note: Using ID-only since we have CompressedWorkItem without changedDate
      // TTL (15 min) handles staleness
      const cacheKey = `ado:${workItemId}`;
      const cached = this.cache.get<EnrichedWorkItem>(cacheKey);

      if (cached) {
        return cached;
      }

      // Enrich via ADOEnricher
      const enriched = await this.adoEnricher.enrich(workItemId);

      // Cache result
      this.cache.set(cacheKey, enriched);

      return enriched;
    } else if (item.type === 'pull_request') {
      // PRs don't need enrichment - they don't have descriptions/comments to fetch
      // The PR already has all relevant data from the context compressor
      return null;
    }

    // Unknown type - skip
    return null;
  }

  /**
   * Calculate total tokens for enriched items.
   * Includes all text fields and metadata overhead.
   *
   * @param items - Enriched items
   * @returns Total estimated token count
   */
  private calculateTokens(items: (EnrichedWorkItem | EnrichedGSDItem)[]): number {
    let total = 0;

    for (const item of items) {
      if ('id' in item) {
        // EnrichedWorkItem
        total += estimateTokens(item.title);
        if (item.description) {
          total += estimateTokens(item.description);
        }
        for (const comment of item.comments) {
          total += estimateTokens(comment.text);
          total += estimateTokens(comment.createdBy);
          total += 5; // Date and structure overhead
        }
        if (item.sprintPath) {
          total += estimateTokens(item.sprintPath);
        }
        total += estimateTokens(item.areaPath);
        for (const tag of item.tags) {
          total += estimateTokens(tag);
        }
        for (const relation of item.relations) {
          total += estimateTokens(relation.title);
          total += 5; // Type and structure overhead
        }
        total += 40; // Base metadata overhead per item
      } else {
        // EnrichedGSDItem
        total += estimateTokens(item.name);
        if (item.goalDescription) {
          total += estimateTokens(item.goalDescription);
        }
        if (item.summary) {
          total += estimateTokens(item.summary);
        }
        if (item.currentPhase) {
          total += estimateTokens(item.currentPhase);
        }
        if (item.status) {
          total += estimateTokens(item.status);
        }
        total += 40; // Base metadata overhead per item
      }
    }

    return total;
  }

  /**
   * Apply token budget truncation to items.
   * Follows truncation order: comments -> descriptions -> drop items 9-10.
   * Never drops items 1-5.
   *
   * @param items - Items to truncate
   * @param budget - Token budget
   * @returns Truncated items within budget
   */
  private applyBudgetTruncation(
    items: (EnrichedWorkItem | EnrichedGSDItem)[],
    budget: number
  ): (EnrichedWorkItem | EnrichedGSDItem)[] {
    const result = [...items];

    // Phase 1: Truncate comments (oldest first)
    for (let i = 0; i < result.length; i++) {
      const item = result[i];
      if ('id' in item && item.comments.length > 0) {
        // Start with 1 comment per item, then increase if budget allows
        const truncatedComments = truncateComments(item.comments, 100);
        result[i] = { ...item, comments: truncatedComments };
      }
    }

    let currentTokens = this.calculateTokens(result);
    if (currentTokens <= budget) {
      return result;
    }

    // Phase 2: Truncate descriptions
    for (let i = 0; i < result.length; i++) {
      const item = result[i];
      if ('id' in item && item.description) {
        const truncatedDesc = truncateToTokenBudget(item.description, 100);
        result[i] = { ...item, description: truncatedDesc };
      } else if ('goalDescription' in item && item.goalDescription) {
        const truncatedGoal = truncateToTokenBudget(item.goalDescription, 100);
        result[i] = { ...item, goalDescription: truncatedGoal };
      }
    }

    currentTokens = this.calculateTokens(result);
    if (currentTokens <= budget) {
      return result;
    }

    // Phase 3: Drop items 9-10 if still over budget
    // Never drop items 1-5 (indices 0-4)
    if (result.length > 8) {
      const reducedItems = result.slice(0, 8);
      currentTokens = this.calculateTokens(reducedItems);
      if (currentTokens <= budget) {
        return reducedItems;
      }
    }

    // Phase 4: If still over, drop items 6-8 one by one
    for (let dropIndex = result.length - 1; dropIndex >= 5; dropIndex--) {
      const reducedItems = result.slice(0, dropIndex);
      currentTokens = this.calculateTokens(reducedItems);
      if (currentTokens <= budget) {
        return reducedItems;
      }
    }

    // Last resort: keep only top 5
    return result.slice(0, 5);
  }

  /**
   * Build error message for enrichment failure.
   *
   * @param scoredItem - Item that failed
   * @param error - Error that occurred
   * @returns Formatted error message
   */
  private buildErrorMessage(scoredItem: ScoredItem, error: unknown): string {
    const { item } = scoredItem;
    const errorMsg = error instanceof Error ? error.message : String(error);

    if (item.type === 'work_item') {
      return `Work item ${item.item.id}: ${errorMsg}`;
    } else if (item.type === 'pull_request') {
      return `Pull request ${item.item.id}: ${errorMsg}`;
    }

    return `Unknown item: ${errorMsg}`;
  }
}
