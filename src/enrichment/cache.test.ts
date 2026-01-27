/**
 * Enrichment Cache Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnrichmentCache } from './cache.js';

describe('EnrichmentCache', () => {
  let cache: EnrichmentCache;

  beforeEach(() => {
    cache = new EnrichmentCache();
  });

  describe('get/set operations', () => {
    it('returns null for cache miss', () => {
      const result = cache.get('nonexistent-key');
      expect(result).toBeNull();
    });

    it('returns cached value after set', () => {
      const data = { id: 123, title: 'Test Work Item' };
      cache.set('test-key', data);

      const result = cache.get('test-key');
      expect(result).toEqual(data);
    });

    it('caches different types of data', () => {
      cache.set('string', 'hello');
      cache.set('number', 42);
      cache.set('object', { foo: 'bar' });
      cache.set('array', [1, 2, 3]);

      expect(cache.get('string')).toBe('hello');
      expect(cache.get('number')).toBe(42);
      expect(cache.get('object')).toEqual({ foo: 'bar' });
      expect(cache.get('array')).toEqual([1, 2, 3]);
    });

    it('overwrites existing key', () => {
      cache.set('key', 'first');
      cache.set('key', 'second');

      expect(cache.get('key')).toBe('second');
    });
  });

  describe('TTL expiration', () => {
    it('expires entries after TTL', async () => {
      // Create cache with 1 second TTL for fast testing
      const shortCache = new EnrichmentCache(1);
      shortCache.set('test-key', 'test-value');

      // Should be available immediately
      expect(shortCache.get('test-key')).toBe('test-value');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be expired
      expect(shortCache.get('test-key')).toBeNull();
    });

    it('uses default 15-minute TTL', () => {
      // Create cache with default TTL
      const defaultCache = new EnrichmentCache();
      defaultCache.set('test-key', 'test-value');

      // Should still be available after 1 second (well within 15 minutes)
      expect(defaultCache.get('test-key')).toBe('test-value');
    });
  });

  describe('buildADOKey', () => {
    it('includes work item ID and date', () => {
      const key = EnrichmentCache.buildADOKey(123, '2026-01-27T10:30:00Z');
      expect(key).toBe('ado:123:2026-01-27');
    });

    it('extracts date portion ignoring time', () => {
      const key1 = EnrichmentCache.buildADOKey(123, '2026-01-27T10:00:00Z');
      const key2 = EnrichmentCache.buildADOKey(123, '2026-01-27T15:30:45Z');
      expect(key1).toBe(key2); // Same date = same key
    });

    it('generates different keys for different dates', () => {
      const key1 = EnrichmentCache.buildADOKey(123, '2026-01-27T10:00:00Z');
      const key2 = EnrichmentCache.buildADOKey(123, '2026-01-28T10:00:00Z');
      expect(key1).not.toBe(key2);
    });

    it('generates different keys for different work items', () => {
      const key1 = EnrichmentCache.buildADOKey(123, '2026-01-27T10:00:00Z');
      const key2 = EnrichmentCache.buildADOKey(456, '2026-01-27T10:00:00Z');
      expect(key1).not.toBe(key2);
    });

    it('handles ISO date strings from Azure DevOps', () => {
      // Azure DevOps returns dates like "2026-01-27T10:30:00.123Z"
      const key = EnrichmentCache.buildADOKey(123, '2026-01-27T10:30:00.123Z');
      expect(key).toBe('ado:123:2026-01-27');
    });
  });

  describe('buildGSDKey', () => {
    it('generates consistent key for same path', () => {
      const key1 = EnrichmentCache.buildGSDKey('/Users/test/project');
      const key2 = EnrichmentCache.buildGSDKey('/Users/test/project');
      expect(key1).toBe(key2);
    });

    it('generates different keys for different paths', () => {
      const key1 = EnrichmentCache.buildGSDKey('/Users/test/project1');
      const key2 = EnrichmentCache.buildGSDKey('/Users/test/project2');
      expect(key1).not.toBe(key2);
    });

    it('normalizes trailing slashes', () => {
      const key1 = EnrichmentCache.buildGSDKey('/Users/test/project');
      const key2 = EnrichmentCache.buildGSDKey('/Users/test/project/');
      expect(key1).toBe(key2);
    });

    it('includes gsd prefix', () => {
      const key = EnrichmentCache.buildGSDKey('/Users/test/project');
      expect(key).toMatch(/^gsd:/);
    });
  });

  describe('getStats', () => {
    it('tracks number of keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      const stats = cache.getStats();
      expect(stats.keys).toBe(3);
    });

    it('tracks cache hits', () => {
      cache.set('key', 'value');

      cache.get('key'); // hit
      cache.get('key'); // hit

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
    });

    it('tracks cache misses', () => {
      cache.get('nonexistent1'); // miss
      cache.get('nonexistent2'); // miss
      cache.get('nonexistent3'); // miss

      const stats = cache.getStats();
      expect(stats.misses).toBe(3);
    });

    it('tracks both hits and misses', () => {
      cache.set('existing', 'value');

      cache.get('existing'); // hit
      cache.get('missing'); // miss
      cache.get('existing'); // hit
      cache.get('another-missing'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
    });
  });

  describe('clear', () => {
    it('removes all cached entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });

    it('resets key count to zero', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      const stats = cache.getStats();
      expect(stats.keys).toBe(0);
    });

    it('allows new entries after clear', () => {
      cache.set('old-key', 'old-value');
      cache.clear();
      cache.set('new-key', 'new-value');

      expect(cache.get('new-key')).toBe('new-value');
    });
  });
});
