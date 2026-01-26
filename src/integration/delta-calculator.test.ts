/**
 * Tests for delta calculator.
 */

import { describe, it, expect } from 'vitest';
import { calculateDelta } from './delta-calculator.js';
import type { BriefingItem } from '../triage/schemas.js';

describe('calculateDelta', () => {
  const workItem1: BriefingItem = {
    id: 12345,
    type: 'work_item',
    title: 'Fix login bug',
    priority_reason: 'Blocking production deployment',
    needs_response: false,
  };

  const workItem2: BriefingItem = {
    id: 12346,
    type: 'work_item',
    title: 'Update documentation',
    priority_reason: 'Sprint deadline approaching',
    needs_response: false,
  };

  const pullRequest1: BriefingItem = {
    id: 789,
    type: 'pull_request',
    title: 'Add auth tests',
    priority_reason: 'VIP review requested',
    needs_response: true,
    suggested_response: 'Thanks for the review!',
  };

  it('should detect added items', () => {
    const morning: BriefingItem[] = [];
    const current: BriefingItem[] = [workItem1, pullRequest1];

    const delta = calculateDelta(morning, current);

    expect(delta.added).toHaveLength(2);
    expect(delta.added[0]).toEqual({
      id: 12345,
      type: 'work_item',
      title: 'Fix login bug',
      change_type: 'added',
      current_reason: 'Blocking production deployment',
    });
    expect(delta.added[1]).toEqual({
      id: 789,
      type: 'pull_request',
      title: 'Add auth tests',
      change_type: 'added',
      current_reason: 'VIP review requested',
    });
    expect(delta.removed).toHaveLength(0);
    expect(delta.changed).toHaveLength(0);
    expect(delta.unchanged).toHaveLength(0);
  });

  it('should detect removed items', () => {
    const morning: BriefingItem[] = [workItem1, pullRequest1];
    const current: BriefingItem[] = [];

    const delta = calculateDelta(morning, current);

    expect(delta.removed).toHaveLength(2);
    expect(delta.removed[0]).toEqual({
      id: 12345,
      type: 'work_item',
      title: 'Fix login bug',
      change_type: 'removed',
      morning_reason: 'Blocking production deployment',
    });
    expect(delta.removed[1]).toEqual({
      id: 789,
      type: 'pull_request',
      title: 'Add auth tests',
      change_type: 'removed',
      morning_reason: 'VIP review requested',
    });
    expect(delta.added).toHaveLength(0);
    expect(delta.changed).toHaveLength(0);
    expect(delta.unchanged).toHaveLength(0);
  });

  it('should detect changed items', () => {
    const morningItem: BriefingItem = {
      ...workItem1,
      priority_reason: 'Original reason',
    };
    const currentItem: BriefingItem = {
      ...workItem1,
      priority_reason: 'Updated reason',
    };

    const delta = calculateDelta([morningItem], [currentItem]);

    expect(delta.changed).toHaveLength(1);
    expect(delta.changed[0]).toEqual({
      id: 12345,
      type: 'work_item',
      title: 'Fix login bug',
      change_type: 'changed',
      morning_reason: 'Original reason',
      current_reason: 'Updated reason',
    });
    expect(delta.added).toHaveLength(0);
    expect(delta.removed).toHaveLength(0);
    expect(delta.unchanged).toHaveLength(0);
  });

  it('should detect unchanged items', () => {
    const delta = calculateDelta([workItem1], [workItem1]);

    expect(delta.unchanged).toHaveLength(1);
    expect(delta.unchanged[0]).toEqual({
      id: 12345,
      type: 'work_item',
      title: 'Fix login bug',
      change_type: 'unchanged',
      morning_reason: 'Blocking production deployment',
      current_reason: 'Blocking production deployment',
    });
    expect(delta.added).toHaveLength(0);
    expect(delta.removed).toHaveLength(0);
    expect(delta.changed).toHaveLength(0);
  });

  it('should handle mixed scenarios', () => {
    const morningItem2Changed: BriefingItem = {
      ...workItem2,
      priority_reason: 'Old deadline',
    };

    const morning: BriefingItem[] = [workItem1, morningItem2Changed, pullRequest1];

    const currentItem2Changed: BriefingItem = {
      ...workItem2,
      priority_reason: 'New deadline',
    };
    const newWorkItem: BriefingItem = {
      id: 99999,
      type: 'work_item',
      title: 'New item',
      priority_reason: 'Just added',
      needs_response: false,
    };

    const current: BriefingItem[] = [currentItem2Changed, newWorkItem, pullRequest1];

    const delta = calculateDelta(morning, current);

    // workItem1 removed, newWorkItem added, workItem2 changed, pullRequest1 unchanged
    expect(delta.added).toHaveLength(1);
    expect(delta.added[0].id).toBe(99999);

    expect(delta.removed).toHaveLength(1);
    expect(delta.removed[0].id).toBe(12345);

    expect(delta.changed).toHaveLength(1);
    expect(delta.changed[0].id).toBe(12346);
    expect(delta.changed[0].morning_reason).toBe('Old deadline');
    expect(delta.changed[0].current_reason).toBe('New deadline');

    expect(delta.unchanged).toHaveLength(1);
    expect(delta.unchanged[0].id).toBe(789);
  });

  it('should handle empty morning and current briefings', () => {
    const delta = calculateDelta([], []);

    expect(delta.added).toHaveLength(0);
    expect(delta.removed).toHaveLength(0);
    expect(delta.changed).toHaveLength(0);
    expect(delta.unchanged).toHaveLength(0);
  });

  it('should distinguish work items and PRs with same ID', () => {
    const workItem: BriefingItem = {
      id: 100,
      type: 'work_item',
      title: 'Work Item 100',
      priority_reason: 'Reason A',
      needs_response: false,
    };

    const pullRequest: BriefingItem = {
      id: 100,
      type: 'pull_request',
      title: 'Pull Request 100',
      priority_reason: 'Reason B',
      needs_response: false,
    };

    const delta = calculateDelta([workItem], [pullRequest]);

    // Work item removed, PR added (different types, same ID)
    expect(delta.added).toHaveLength(1);
    expect(delta.added[0].type).toBe('pull_request');
    expect(delta.added[0].id).toBe(100);

    expect(delta.removed).toHaveLength(1);
    expect(delta.removed[0].type).toBe('work_item');
    expect(delta.removed[0].id).toBe(100);

    expect(delta.changed).toHaveLength(0);
    expect(delta.unchanged).toHaveLength(0);
  });

  it('should use O(1) map lookups (performance test)', () => {
    // Generate large datasets to verify Map-based approach
    const morning: BriefingItem[] = [];
    const current: BriefingItem[] = [];

    // Create 1000 morning items
    for (let i = 0; i < 1000; i++) {
      morning.push({
        id: i,
        type: 'work_item',
        title: `Item ${i}`,
        priority_reason: `Reason ${i}`,
        needs_response: false,
      });
    }

    // Create 1000 current items (500 overlap, 500 new)
    for (let i = 500; i < 1500; i++) {
      current.push({
        id: i,
        type: 'work_item',
        title: `Item ${i}`,
        priority_reason: `Reason ${i}`,
        needs_response: false,
      });
    }

    const startTime = Date.now();
    const delta = calculateDelta(morning, current);
    const duration = Date.now() - startTime;

    // Should complete very quickly with O(n+m) algorithm
    // Nested loops O(n*m) would be 1000*1000 = 1M operations
    // Map-based O(n+m) is 1000+1000 = 2K operations
    expect(duration).toBeLessThan(100); // Should be ~1-5ms

    // Verify correctness
    expect(delta.removed).toHaveLength(500); // 0-499 removed
    expect(delta.unchanged).toHaveLength(500); // 500-999 unchanged
    expect(delta.added).toHaveLength(500); // 1000-1499 added
    expect(delta.changed).toHaveLength(0);
  });
});
