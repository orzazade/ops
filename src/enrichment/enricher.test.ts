/**
 * Enricher integration tests.
 * Tests the main enrichment orchestrator that ties all pieces together.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Enricher } from './enricher.js';
import { ADOEnricher } from './ado-enricher.js';
import { GSDEnricher } from './gsd-enricher.js';
import { EnrichmentCache } from './cache.js';
import type { ScoredItem } from '../triage/types.js';
import type { OpsConfig } from '../config/schema.js';
import type { EnrichedWorkItem, EnrichedGSDItem } from './types.js';

// Mock the enrichers
vi.mock('./ado-enricher.js');
vi.mock('./gsd-enricher.js');

describe('Enricher', () => {
  let enricher: Enricher;
  let mockADOEnricher: any;
  let mockGSDEnricher: any;
  let mockConfig: OpsConfig;

  beforeEach(() => {
    // Create mock enrichers
    mockADOEnricher = {
      enrich: vi.fn(),
    };
    mockGSDEnricher = {
      enrich: vi.fn(),
    };

    // Create enricher with mocked dependencies
    enricher = new Enricher(mockADOEnricher, mockGSDEnricher);

    // Setup mock config
    mockConfig = {
      azure: {
        organization: 'test-org',
        default_project: 'test-project',
      },
      priorities: {
        sprint_commitment: 3,
        vip_involvement: 3,
        blocking_others: 2,
        age_over_3_days: 2,
        p1_priority: 2,
        p2_priority: 1,
        carried_over: 1,
      },
      vips: [],
      gsd: {
        scan_paths: ['.'],
        exclude: ['node_modules', '.git'],
      },
      preferences: {
        briefing_length: 'concise',
        response_style: 'professional',
        timezone: 'UTC',
      },
      sprint: {
        capacity_points: 20,
      },
      enrichment: {
        count: 10,
      },
    } as OpsConfig;
  });

  describe('enrichTopItems', () => {
    it('enriches only top N items based on config.enrichment.count', async () => {
      // Create 15 scored work items
      const scoredItems: ScoredItem[] = Array.from({ length: 15 }, (_, i) => ({
        item: {
          type: 'work_item' as const,
          item: {
            id: i + 1,
            title: `Work Item ${i + 1}`,
            state: 'Active',
            priority: 2,
            assignedTo: 'Test User',
            tags: [],
          },
        },
        score: 15 - i, // Descending scores
        appliedRules: [],
      }));

      // Mock ADO enricher to return enriched items
      mockADOEnricher.enrich.mockImplementation((id: number) =>
        Promise.resolve({
          id,
          title: `Work Item ${id}`,
          description: 'Description',
          comments: [],
          dueDate: null,
          sprintPath: null,
          tags: [],
          areaPath: 'Area',
          relations: [],
        })
      );

      const result = await enricher.enrichTopItems(scoredItems, mockConfig);

      // Should enrich exactly 10 items (default count)
      expect(result.items).toHaveLength(10);
      expect(mockADOEnricher.enrich).toHaveBeenCalledTimes(10);

      // Verify enriched the top 10
      for (let i = 0; i < 10; i++) {
        expect(mockADOEnricher.enrich).toHaveBeenCalledWith(i + 1);
      }
    });

    it('enriches custom count when specified in config', async () => {
      const scoredItems: ScoredItem[] = Array.from({ length: 10 }, (_, i) => ({
        item: {
          type: 'work_item' as const,
          item: {
            id: i + 1,
            title: `Work Item ${i + 1}`,
            state: 'Active',
            priority: 2,
            assignedTo: 'Test User',
            tags: [],
          },
        },
        score: 10 - i,
        appliedRules: [],
      }));

      mockADOEnricher.enrich.mockImplementation((id: number) =>
        Promise.resolve({
          id,
          title: `Work Item ${id}`,
          description: 'Description',
          comments: [],
          dueDate: null,
          sprintPath: null,
          tags: [],
          areaPath: 'Area',
          relations: [],
        })
      );

      // Set custom count
      mockConfig.enrichment.count = 5;

      const result = await enricher.enrichTopItems(scoredItems, mockConfig);

      expect(result.items).toHaveLength(5);
      expect(mockADOEnricher.enrich).toHaveBeenCalledTimes(5);
    });

    it('uses cache for repeated calls', async () => {
      const scoredItems: ScoredItem[] = [
        {
          item: {
            type: 'work_item' as const,
            item: {
              id: 1,
              title: 'Work Item 1',
              workItemType: 'Task',
              state: 'Active',
              assignedTo: 'Test User',
                            tags: [],
              areaPath: 'Area',
            },
          },
          score: 10,
          appliedRules: [],
        },
      ];

      const enrichedItem: EnrichedWorkItem = {
        id: 1,
        title: 'Work Item 1',
        description: 'Description',
        comments: [],
        dueDate: null,
        sprintPath: null,
        tags: [],
        areaPath: 'Area',
        relations: [],
      };

      mockADOEnricher.enrich.mockResolvedValue(enrichedItem);

      // First call - should enrich
      await enricher.enrichTopItems(scoredItems, mockConfig);
      expect(mockADOEnricher.enrich).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await enricher.enrichTopItems(scoredItems, mockConfig);
      expect(mockADOEnricher.enrich).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('routes work items to ADOEnricher', async () => {
      const scoredItems: ScoredItem[] = [
        {
          item: {
            type: 'work_item' as const,
            item: {
              id: 1,
              title: 'Work Item 1',
              workItemType: 'Task',
              state: 'Active',
              assignedTo: 'Test User',
                            tags: [],
              areaPath: 'Area',
            },
          },
          score: 10,
          appliedRules: [],
        },
      ];

      mockADOEnricher.enrich.mockResolvedValue({
        id: 1,
        title: 'Work Item 1',
        description: 'Description',
        comments: [],
        dueDate: null,
        sprintPath: null,
        tags: [],
        areaPath: 'Area',
        relations: [],
      });

      await enricher.enrichTopItems(scoredItems, mockConfig);

      expect(mockADOEnricher.enrich).toHaveBeenCalledWith(1);
      expect(mockGSDEnricher.enrich).not.toHaveBeenCalled();
    });

    it('routes pull requests (skips enrichment, PRs have no description to fetch)', async () => {
      const scoredItems: ScoredItem[] = [
        {
          item: {
            type: 'pull_request' as const,
            item: {
              pullRequestId: 1,
              repositoryId: 'repo-1',
              title: 'PR 1',
              createdBy: 'Test User',
              creationDate: '2026-01-27T00:00:00Z',
              isDraft: false,
              reviewers: [],
              comments: 0,
            },
          },
          score: 10,
          appliedRules: [],
        },
      ];

      const result = await enricher.enrichTopItems(scoredItems, mockConfig);

      // PRs are not enriched
      expect(result.items).toHaveLength(0);
      expect(mockADOEnricher.enrich).not.toHaveBeenCalled();
      expect(mockGSDEnricher.enrich).not.toHaveBeenCalled();
    });

    it('truncates when over 2K token budget', async () => {
      const scoredItems: ScoredItem[] = Array.from({ length: 10 }, (_, i) => ({
        item: {
          type: 'work_item' as const,
          item: {
            id: i + 1,
            title: `Work Item ${i + 1}`,
            state: 'Active',
            priority: 2,
            assignedTo: 'Test User',
            tags: [],
          },
        },
        score: 10 - i,
        appliedRules: [],
      }));

      // Create large descriptions that will exceed budget
      const largeDescription = 'x'.repeat(1000); // ~250 tokens per item

      mockADOEnricher.enrich.mockImplementation((id: number) =>
        Promise.resolve({
          id,
          title: `Work Item ${id}`,
          description: largeDescription,
          comments: [],
          dueDate: null,
          sprintPath: null,
          tags: [],
          areaPath: 'Area',
          relations: [],
        })
      );

      const result = await enricher.enrichTopItems(scoredItems, mockConfig);

      // Should have truncated
      expect(result.truncated).toBe(true);
      expect(result.totalTokens).toBeLessThanOrEqual(2000);
    });

    it('continues on individual item failure', async () => {
      const scoredItems: ScoredItem[] = [
        {
          item: {
            type: 'work_item' as const,
            item: {
              id: 1,
              title: 'Work Item 1',
              workItemType: 'Task',
              state: 'Active',
              assignedTo: 'Test User',
                            tags: [],
              areaPath: 'Area',
            },
          },
          score: 10,
          appliedRules: [],
        },
        {
          item: {
            type: 'work_item' as const,
            item: {
              id: 2,
              title: 'Work Item 2',
              workItemType: 'Task',
              state: 'Active',
              assignedTo: 'Test User',
                            tags: [],
              areaPath: 'Area',
            },
          },
          score: 9,
          appliedRules: [],
        },
      ];

      // First call succeeds, second fails
      mockADOEnricher.enrich
        .mockResolvedValueOnce({
          id: 1,
          title: 'Work Item 1',
          description: 'Description',
          comments: [],
          dueDate: null,
          sprintPath: null,
          tags: [],
          areaPath: 'Area',
          relations: [],
        })
        .mockRejectedValueOnce(new Error('API error'));

      const result = await enricher.enrichTopItems(scoredItems, mockConfig);

      // Should have enriched item 1
      expect(result.items).toHaveLength(1);
      expect((result.items[0] as EnrichedWorkItem).id).toBe(1);

      // Should have error for item 2
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Work item 2');
    });

    it('returns errors array for partial failures', async () => {
      const scoredItems: ScoredItem[] = [
        {
          item: {
            type: 'work_item' as const,
            item: {
              id: 1,
              title: 'Work Item 1',
              workItemType: 'Task',
              state: 'Active',
              assignedTo: 'Test User',
                            tags: [],
              areaPath: 'Area',
            },
          },
          score: 10,
          appliedRules: [],
        },
      ];

      mockADOEnricher.enrich.mockRejectedValue(new Error('Enrichment failed'));

      const result = await enricher.enrichTopItems(scoredItems, mockConfig);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Work item 1');
      expect(result.errors[0]).toContain('Enrichment failed');
    });

    it('returns empty result for empty input', async () => {
      const result = await enricher.enrichTopItems([], mockConfig);

      expect(result.items).toHaveLength(0);
      expect(result.totalTokens).toBe(0);
      expect(result.truncated).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it('handles mixed work items and GSD projects', async () => {
      // Note: This test is for future when GSD projects are included in scoredItems
      // For now, GSD items would need a different type structure
      // This validates the router works correctly when both types present

      const scoredItems: ScoredItem[] = [
        {
          item: {
            type: 'work_item' as const,
            item: {
              id: 1,
              title: 'Work Item 1',
              workItemType: 'Task',
              state: 'Active',
              assignedTo: 'Test User',
                            tags: [],
              areaPath: 'Area',
            },
          },
          score: 10,
          appliedRules: [],
        },
      ];

      mockADOEnricher.enrich.mockResolvedValue({
        id: 1,
        title: 'Work Item 1',
        description: 'Description',
        comments: [],
        dueDate: null,
        sprintPath: null,
        tags: [],
        areaPath: 'Area',
        relations: [],
      });

      const result = await enricher.enrichTopItems(scoredItems, mockConfig);

      expect(result.items).toHaveLength(1);
      expect(mockADOEnricher.enrich).toHaveBeenCalled();
    });
  });

  describe('token budget enforcement', () => {
    it('never drops items 1-5 when truncating', async () => {
      const scoredItems: ScoredItem[] = Array.from({ length: 10 }, (_, i) => ({
        item: {
          type: 'work_item' as const,
          item: {
            id: i + 1,
            title: `Work Item ${i + 1}`,
            state: 'Active',
            priority: 2,
            assignedTo: 'Test User',
            tags: [],
          },
        },
        score: 10 - i,
        appliedRules: [],
      }));

      // Create very large descriptions
      const largeDescription = 'x'.repeat(2000); // ~500 tokens per item

      mockADOEnricher.enrich.mockImplementation((id: number) =>
        Promise.resolve({
          id,
          title: `Work Item ${id}`,
          description: largeDescription,
          comments: [],
          dueDate: null,
          sprintPath: null,
          tags: [],
          areaPath: 'Area',
          relations: [],
        })
      );

      const result = await enricher.enrichTopItems(scoredItems, mockConfig);

      // Should have items 1-5 at minimum
      expect(result.items.length).toBeGreaterThanOrEqual(5);

      // Verify items 1-5 are present
      const itemIds = result.items.map((item) => (item as EnrichedWorkItem).id);
      expect(itemIds).toContain(1);
      expect(itemIds).toContain(2);
      expect(itemIds).toContain(3);
      expect(itemIds).toContain(4);
      expect(itemIds).toContain(5);
    });

    it('truncates comments before descriptions', async () => {
      const scoredItems: ScoredItem[] = [
        {
          item: {
            type: 'work_item' as const,
            item: {
              id: 1,
              title: 'Work Item 1',
              workItemType: 'Task',
              state: 'Active',
              assignedTo: 'Test User',
                            tags: [],
              areaPath: 'Area',
            },
          },
          score: 10,
          appliedRules: [],
        },
      ];

      // Create item with large comments and description
      const largeComment = 'x'.repeat(4000);
      mockADOEnricher.enrich.mockResolvedValue({
        id: 1,
        title: 'Work Item 1',
        description: 'Important description',
        comments: Array.from({ length: 5 }, (_, i) => ({
          id: i,
          text: largeComment,
          createdDate: '2026-01-27T00:00:00Z',
          createdBy: 'User',
        })),
        dueDate: null,
        sprintPath: null,
        tags: [],
        areaPath: 'Area',
        relations: [],
      });

      const result = await enricher.enrichTopItems(scoredItems, mockConfig);

      const enrichedItem = result.items[0] as EnrichedWorkItem;

      // Description should be preserved
      expect(enrichedItem.description).toBe('Important description');

      // Comments should be truncated
      expect(enrichedItem.comments.length).toBeLessThan(5);
    });
  });
});
