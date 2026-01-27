/**
 * Enrichment Cache
 *
 * In-memory cache for enriched work item data with TTL (Time To Live).
 * Prevents redundant API calls for recently enriched items.
 *
 * Cache invalidation:
 * - Automatic: TTL expires (default 15 minutes)
 * - Automatic: changedDate in key changes (work item updated)
 * - Manual: clear() method
 */

import NodeCache from 'node-cache';

export interface CacheStats {
  keys: number;
  hits: number;
  misses: number;
}

export class EnrichmentCache {
  private cache: NodeCache;

  /**
   * Create enrichment cache
   * @param ttlSeconds Time to live in seconds (default: 900 = 15 minutes)
   */
  constructor(ttlSeconds: number = 900) {
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: Math.floor(ttlSeconds / 10), // Check for expired keys every ~1.5 minutes
      useClones: false, // Don't clone objects for performance
    });
  }

  /**
   * Get cached value
   * @returns Cached value or null if not found/expired
   */
  get<T>(key: string): T | null {
    const value = this.cache.get<T>(key);
    return value !== undefined ? value : null;
  }

  /**
   * Set cached value
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, data);
  }

  /**
   * Build cache key for Azure DevOps work item
   * Includes changedDate to auto-invalidate when item updates
   * @param workItemId Work item ID
   * @param changedDate ISO date string from work item's changedDate field
   */
  static buildADOKey(workItemId: number, changedDate: string): string {
    // Extract date portion (ignore time) for more stable keys
    const dateOnly = changedDate.split('T')[0];
    return `ado:${workItemId}:${dateOnly}`;
  }

  /**
   * Build cache key for GSD plan
   * @param projectPath Absolute path to project root
   */
  static buildGSDKey(projectPath: string): string {
    // Normalize path to handle trailing slashes consistently
    const normalized = projectPath.replace(/\/$/, '');
    return `gsd:${normalized}`;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const stats = this.cache.getStats();
    return {
      keys: this.cache.keys().length,
      hits: stats.hits,
      misses: stats.misses,
    };
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.flushAll();
  }
}
