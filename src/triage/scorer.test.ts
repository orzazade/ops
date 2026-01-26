/**
 * Tests for PriorityScorer
 */

import { describe, it, expect } from 'vitest';
import { PriorityScorer } from './scorer.js';
import type { OpsConfig } from '../config/schema.js';
import type { ScoreableItem } from './types.js';
import type { CompressedWorkItem, CompressedPR } from '../context/types.js';

describe('PriorityScorer', () => {
  // Test config with known weights
  const testConfig: OpsConfig = {
    azure: {
      organization: 'test-org',
      default_project: 'test-project',
    },
    vips: [
      { name: 'Alice Johnson', role: 'Director', priority: 'highest' },
      { name: 'Bob Smith', role: 'VP', priority: 'high' },
    ],
    priorities: {
      sprint_commitment: 3,
      vip_involvement: 3,
      blocking_others: 2,
      age_over_3_days: 2,
      p1_priority: 2,
      p2_priority: 1,
      carried_over: 1,
    },
    gsd: {
      scan_paths: ['.'],
      exclude: ['node_modules', '.git'],
    },
    preferences: {
      briefing_length: 'concise',
      response_style: 'professional',
      timezone: 'UTC',
    },
  };

  describe('Work Item Scoring', () => {
    it('should score P1 work item with VIP assignment', () => {
      const scorer = new PriorityScorer(testConfig);
      const workItem: CompressedWorkItem = {
        id: 1,
        title: 'Critical bug fix',
        state: 'Active',
        priority: 1,
        assignedTo: 'Alice Johnson',
      };

      const scoreableItem: ScoreableItem = {
        type: 'work_item',
        item: workItem,
      };

      const result = scorer.score(scoreableItem);

      // Should match: p1_priority(2) + vip_involvement(3) = 5
      expect(result.score).toBe(5);
      expect(result.appliedRules).toHaveLength(2);
      expect(result.appliedRules.map(r => r.name)).toContain('p1_priority');
      expect(result.appliedRules.map(r => r.name)).toContain('vip_involvement');
    });

    it('should score P2 work item without VIP', () => {
      const scorer = new PriorityScorer(testConfig);
      const workItem: CompressedWorkItem = {
        id: 2,
        title: 'Medium priority task',
        state: 'Active',
        priority: 2,
        assignedTo: 'Charlie Developer',
      };

      const scoreableItem: ScoreableItem = {
        type: 'work_item',
        item: workItem,
      };

      const result = scorer.score(scoreableItem);

      // Should match: p2_priority(1) = 1
      expect(result.score).toBe(1);
      expect(result.appliedRules).toHaveLength(1);
      expect(result.appliedRules[0].name).toBe('p2_priority');
    });

    it('should score P3 work item with VIP', () => {
      const scorer = new PriorityScorer(testConfig);
      const workItem: CompressedWorkItem = {
        id: 3,
        title: 'Low priority enhancement',
        state: 'Active',
        priority: 3,
        assignedTo: 'bob smith', // Case-insensitive match
      };

      const scoreableItem: ScoreableItem = {
        type: 'work_item',
        item: workItem,
      };

      const result = scorer.score(scoreableItem);

      // Should match: vip_involvement(3) = 3
      expect(result.score).toBe(3);
      expect(result.appliedRules).toHaveLength(1);
      expect(result.appliedRules[0].name).toBe('vip_involvement');
    });

    it('should score work item with no matching rules', () => {
      const scorer = new PriorityScorer(testConfig);
      const workItem: CompressedWorkItem = {
        id: 4,
        title: 'Regular task',
        state: 'Active',
        priority: 3,
      };

      const scoreableItem: ScoreableItem = {
        type: 'work_item',
        item: workItem,
      };

      const result = scorer.score(scoreableItem);

      expect(result.score).toBe(0);
      expect(result.appliedRules).toHaveLength(0);
    });

    it('should handle VIP partial name matching', () => {
      const scorer = new PriorityScorer(testConfig);
      const workItem: CompressedWorkItem = {
        id: 5,
        title: 'Task',
        state: 'Active',
        priority: 3,
        assignedTo: 'alice', // Partial match for "Alice Johnson"
      };

      const scoreableItem: ScoreableItem = {
        type: 'work_item',
        item: workItem,
      };

      const result = scorer.score(scoreableItem);

      expect(result.score).toBe(3);
      expect(result.appliedRules[0].name).toBe('vip_involvement');
    });

    it('should not match VIP with unrelated substring', () => {
      const scorer = new PriorityScorer(testConfig);
      const workItem: CompressedWorkItem = {
        id: 6,
        title: 'Task',
        state: 'Active',
        priority: 3,
        assignedTo: 'Alicia Roberts', // Contains "ali" but not "alice"
      };

      const scoreableItem: ScoreableItem = {
        type: 'work_item',
        item: workItem,
      };

      const result = scorer.score(scoreableItem);

      expect(result.score).toBe(0);
      expect(result.appliedRules).toHaveLength(0);
    });
  });

  describe('Pull Request Scoring', () => {
    it('should score PR authored by VIP', () => {
      const scorer = new PriorityScorer(testConfig);
      const pr: CompressedPR = {
        id: 100,
        title: 'Feature implementation',
        author: 'Alice Johnson',
        status: 'Active',
        repository: 'main-app',
        reviewerSummary: '1/2 approved',
      };

      const scoreableItem: ScoreableItem = {
        type: 'pull_request',
        item: pr,
      };

      const result = scorer.score(scoreableItem);

      // Should match: vip_involvement(3) = 3
      expect(result.score).toBe(3);
      expect(result.appliedRules).toHaveLength(1);
      expect(result.appliedRules[0].name).toBe('vip_involvement');
    });

    it('should score PR authored by non-VIP', () => {
      const scorer = new PriorityScorer(testConfig);
      const pr: CompressedPR = {
        id: 101,
        title: 'Bug fix',
        author: 'Charlie Developer',
        status: 'Active',
        repository: 'main-app',
        reviewerSummary: '0/2 approved',
      };

      const scoreableItem: ScoreableItem = {
        type: 'pull_request',
        item: pr,
      };

      const result = scorer.score(scoreableItem);

      expect(result.score).toBe(0);
      expect(result.appliedRules).toHaveLength(0);
    });

    it('should handle case-insensitive VIP matching for PR author', () => {
      const scorer = new PriorityScorer(testConfig);
      const pr: CompressedPR = {
        id: 102,
        title: 'Update',
        author: 'BOB SMITH',
        status: 'Active',
        repository: 'api',
        reviewerSummary: '1/1 approved',
      };

      const scoreableItem: ScoreableItem = {
        type: 'pull_request',
        item: pr,
      };

      const result = scorer.score(scoreableItem);

      expect(result.score).toBe(3);
      expect(result.appliedRules[0].name).toBe('vip_involvement');
    });
  });

  describe('scoreAll', () => {
    it('should score and sort multiple items descending by score', () => {
      const scorer = new PriorityScorer(testConfig);

      const items: ScoreableItem[] = [
        {
          type: 'work_item',
          item: {
            id: 1,
            title: 'P3 task',
            state: 'Active',
            priority: 3,
          },
        },
        {
          type: 'work_item',
          item: {
            id: 2,
            title: 'P1 VIP task',
            state: 'Active',
            priority: 1,
            assignedTo: 'Alice Johnson',
          },
        },
        {
          type: 'pull_request',
          item: {
            id: 100,
            title: 'VIP PR',
            author: 'Bob Smith',
            status: 'Active',
            repository: 'app',
            reviewerSummary: '1/2 approved',
          },
        },
        {
          type: 'work_item',
          item: {
            id: 3,
            title: 'P2 task',
            state: 'Active',
            priority: 2,
          },
        },
      ];

      const results = scorer.scoreAll(items);

      expect(results).toHaveLength(4);

      // Verify descending order
      expect(results[0].score).toBe(5); // P1 + VIP
      expect(results[1].score).toBe(3); // VIP PR
      expect(results[2].score).toBe(1); // P2
      expect(results[3].score).toBe(0); // P3 no rules

      // Verify order is maintained
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    it('should handle empty item list', () => {
      const scorer = new PriorityScorer(testConfig);
      const results = scorer.scoreAll([]);

      expect(results).toHaveLength(0);
      expect(results).toEqual([]);
    });

    it('should preserve item data in scored results', () => {
      const scorer = new PriorityScorer(testConfig);

      const workItem: CompressedWorkItem = {
        id: 1,
        title: 'Test task',
        state: 'Active',
        priority: 1,
        assignedTo: 'Alice Johnson',
        tags: ['urgent', 'backend'],
      };

      const items: ScoreableItem[] = [
        {
          type: 'work_item',
          item: workItem,
        },
      ];

      const results = scorer.scoreAll(items);

      expect(results[0].item.type).toBe('work_item');
      if (results[0].item.type === 'work_item') {
        expect(results[0].item.item).toEqual(workItem);
        expect(results[0].item.item.tags).toEqual(['urgent', 'backend']);
      }
    });
  });

  describe('VIP Matching Edge Cases', () => {
    it('should handle undefined assignedTo', () => {
      const scorer = new PriorityScorer(testConfig);
      const workItem: CompressedWorkItem = {
        id: 1,
        title: 'Unassigned task',
        state: 'Active',
        priority: 1,
      };

      const scoreableItem: ScoreableItem = {
        type: 'work_item',
        item: workItem,
      };

      const result = scorer.score(scoreableItem);

      // Should match p1_priority but not vip_involvement
      expect(result.score).toBe(2);
      expect(result.appliedRules).toHaveLength(1);
      expect(result.appliedRules[0].name).toBe('p1_priority');
    });

    it('should handle empty VIP list', () => {
      const configNoVips: OpsConfig = {
        ...testConfig,
        vips: [],
      };

      const scorer = new PriorityScorer(configNoVips);
      const workItem: CompressedWorkItem = {
        id: 1,
        title: 'Task',
        state: 'Active',
        priority: 1,
        assignedTo: 'Anyone',
      };

      const scoreableItem: ScoreableItem = {
        type: 'work_item',
        item: workItem,
      };

      const result = scorer.score(scoreableItem);

      expect(result.score).toBe(2); // Only p1_priority
      expect(result.appliedRules).toHaveLength(1);
    });

    it('should handle whitespace in names', () => {
      const scorer = new PriorityScorer(testConfig);
      const workItem: CompressedWorkItem = {
        id: 1,
        title: 'Task',
        state: 'Active',
        priority: 3,
        assignedTo: '  alice johnson  ',
      };

      const scoreableItem: ScoreableItem = {
        type: 'work_item',
        item: workItem,
      };

      const result = scorer.score(scoreableItem);

      expect(result.score).toBe(3);
      expect(result.appliedRules[0].name).toBe('vip_involvement');
    });
  });

  describe('Custom Priority Weights', () => {
    it('should use custom weights from config', () => {
      const customConfig: OpsConfig = {
        ...testConfig,
        priorities: {
          sprint_commitment: 10,
          vip_involvement: 5,
          blocking_others: 3,
          age_over_3_days: 2,
          p1_priority: 8,
          p2_priority: 4,
          carried_over: 1,
        },
      };

      const scorer = new PriorityScorer(customConfig);
      const workItem: CompressedWorkItem = {
        id: 1,
        title: 'P1 VIP task',
        state: 'Active',
        priority: 1,
        assignedTo: 'Alice Johnson',
      };

      const scoreableItem: ScoreableItem = {
        type: 'work_item',
        item: workItem,
      };

      const result = scorer.score(scoreableItem);

      // Should use custom weights: p1_priority(8) + vip_involvement(5) = 13
      expect(result.score).toBe(13);
      expect(result.appliedRules).toHaveLength(2);

      const p1Rule = result.appliedRules.find(r => r.name === 'p1_priority');
      const vipRule = result.appliedRules.find(r => r.name === 'vip_involvement');

      expect(p1Rule?.weight).toBe(8);
      expect(vipRule?.weight).toBe(5);
    });
  });
});
