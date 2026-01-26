import { describe, it, expect } from 'vitest';
import { analyzeLoad, distributeItems, suggestDeferrals } from './capacity.js';

// Minimal inline types for TDD (Plan 01 may define these in types.ts)
interface SprintItem {
  id: string;
  title: string;
  priority: 'P1' | 'P2' | 'P3';
  storyPoints?: number;
  createdDate: Date;
}

describe('analyzeLoad', () => {
  it('should calculate utilization percentage correctly', () => {
    const items: SprintItem[] = [
      { id: '1', title: 'Task 1', priority: 'P1', storyPoints: 5, createdDate: new Date() },
      { id: '2', title: 'Task 2', priority: 'P2', storyPoints: 7, createdDate: new Date() },
    ];

    const result = analyzeLoad(items, 20);

    expect(result.currentCapacity).toBe(12);
    expect(result.maxCapacity).toBe(20);
    expect(result.utilizationPercent).toBe(60);
    expect(result.isOverCommitted).toBe(false);
    expect(result.excessPoints).toBe(0);
  });

  it('should detect over-commitment at >120% capacity', () => {
    const items: SprintItem[] = [
      { id: '1', title: 'Task 1', priority: 'P1', storyPoints: 15, createdDate: new Date() },
      { id: '2', title: 'Task 2', priority: 'P2', storyPoints: 10, createdDate: new Date() },
    ];

    const result = analyzeLoad(items, 20);

    expect(result.currentCapacity).toBe(25);
    expect(result.maxCapacity).toBe(20);
    expect(result.utilizationPercent).toBe(125);
    expect(result.isOverCommitted).toBe(true);
    expect(result.excessPoints).toBe(5);
  });

  it('should default items without storyPoints to 3', () => {
    const items: SprintItem[] = [
      { id: '1', title: 'Task 1', priority: 'P1', createdDate: new Date() }, // no storyPoints
      { id: '2', title: 'Task 2', priority: 'P2', storyPoints: 5, createdDate: new Date() },
    ];

    const result = analyzeLoad(items, 20);

    expect(result.currentCapacity).toBe(8); // 3 + 5
  });

  it('should include deferral suggestions when over-committed', () => {
    const items: SprintItem[] = [
      { id: '1', title: 'Task 1', priority: 'P1', storyPoints: 15, createdDate: new Date() },
      { id: '2', title: 'Task 2', priority: 'P3', storyPoints: 10, createdDate: new Date() },
    ];

    const result = analyzeLoad(items, 20);

    expect(result.isOverCommitted).toBe(true);
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('should handle empty items array', () => {
    const result = analyzeLoad([], 20);

    expect(result.currentCapacity).toBe(0);
    expect(result.utilizationPercent).toBe(0);
    expect(result.isOverCommitted).toBe(false);
  });

  it('should handle exact capacity fit', () => {
    const items: SprintItem[] = [
      { id: '1', title: 'Task 1', priority: 'P1', storyPoints: 20, createdDate: new Date() },
    ];

    const result = analyzeLoad(items, 20);

    expect(result.utilizationPercent).toBe(100);
    expect(result.isOverCommitted).toBe(false);
  });
});

describe('distributeItems', () => {
  it('should use First-Fit Decreasing algorithm', () => {
    const items: SprintItem[] = [
      { id: '1', title: 'Task 1', priority: 'P1', storyPoints: 5, createdDate: new Date() },
      { id: '2', title: 'Task 2', priority: 'P1', storyPoints: 4, createdDate: new Date() },
      { id: '3', title: 'Task 3', priority: 'P2', storyPoints: 3, createdDate: new Date() },
      { id: '4', title: 'Task 4', priority: 'P2', storyPoints: 3, createdDate: new Date() },
      { id: '5', title: 'Task 5', priority: 'P3', storyPoints: 2, createdDate: new Date() },
    ];

    const result = distributeItems(items, 10);

    // Expected distribution: Sprint 1: 5+4=9, Sprint 2: 3+3+2=8
    expect(result.sprints.length).toBe(2);

    // Verify items are assigned
    expect(result.assignments.get('1')).toBe('Sprint 1');
    expect(result.assignments.get('2')).toBe('Sprint 1');
  });

  it('should create new sprint when items do not fit', () => {
    const items: SprintItem[] = [
      { id: '1', title: 'Task 1', priority: 'P1', storyPoints: 8, createdDate: new Date() },
      { id: '2', title: 'Task 2', priority: 'P1', storyPoints: 8, createdDate: new Date() },
      { id: '3', title: 'Task 3', priority: 'P1', storyPoints: 8, createdDate: new Date() },
    ];

    const result = distributeItems(items, 10);

    // Each item needs its own sprint
    expect(result.sprints.length).toBe(3);
    expect(result.assignments.get('1')).toBe('Sprint 1');
    expect(result.assignments.get('2')).toBe('Sprint 2');
    expect(result.assignments.get('3')).toBe('Sprint 3');
  });

  it('should sort items by storyPoints descending', () => {
    const items: SprintItem[] = [
      { id: '1', title: 'Small', priority: 'P1', storyPoints: 2, createdDate: new Date() },
      { id: '2', title: 'Large', priority: 'P1', storyPoints: 8, createdDate: new Date() },
      { id: '3', title: 'Medium', priority: 'P1', storyPoints: 5, createdDate: new Date() },
    ];

    const result = distributeItems(items, 10);

    // First sprint should have the largest items first
    const sprint1 = result.sprints.find(s => s.name === 'Sprint 1');
    expect(sprint1?.items[0].storyPoints).toBe(8);
  });

  it('should handle items without storyPoints (default to 3)', () => {
    const items: SprintItem[] = [
      { id: '1', title: 'Task 1', priority: 'P1', createdDate: new Date() },
      { id: '2', title: 'Task 2', priority: 'P1', storyPoints: 5, createdDate: new Date() },
    ];

    const result = distributeItems(items, 10);

    expect(result.sprints.length).toBe(1); // 3 + 5 = 8, fits in one sprint
  });

  it('should handle empty items array', () => {
    const result = distributeItems([], 10);

    expect(result.sprints.length).toBe(0);
    expect(result.assignments.size).toBe(0);
  });

  it('should handle single item', () => {
    const items: SprintItem[] = [
      { id: '1', title: 'Task 1', priority: 'P1', storyPoints: 5, createdDate: new Date() },
    ];

    const result = distributeItems(items, 10);

    expect(result.sprints.length).toBe(1);
    expect(result.assignments.get('1')).toBe('Sprint 1');
  });
});

describe('suggestDeferrals', () => {
  it('should suggest lowest priority items first', () => {
    const items: SprintItem[] = [
      { id: '1', title: 'P1 Task', priority: 'P1', storyPoints: 5, createdDate: new Date() },
      { id: '2', title: 'P2 Task', priority: 'P2', storyPoints: 5, createdDate: new Date() },
      { id: '3', title: 'P3 Task', priority: 'P3', storyPoints: 5, createdDate: new Date() },
    ];

    const result = suggestDeferrals(items, 10); // 15 points in 10 capacity = 5 excess

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].itemId).toBe('3'); // P3 should be first suggestion
  });

  it('should suggest oldest items when same priority', () => {
    const oldDate = new Date('2025-12-01');
    const newDate = new Date('2026-01-20');

    const items: SprintItem[] = [
      { id: '1', title: 'New P3', priority: 'P3', storyPoints: 5, createdDate: newDate },
      { id: '2', title: 'Old P3', priority: 'P3', storyPoints: 5, createdDate: oldDate },
    ];

    const result = suggestDeferrals(items, 5); // 10 points in 5 capacity = 5 excess

    expect(result[0].itemId).toBe('2'); // Older item should be first
    expect(result[0].reason).toContain('Oldest');
  });

  it('should suggest largest items when same priority and age', () => {
    const sameDate = new Date('2026-01-15');

    const items: SprintItem[] = [
      { id: '1', title: 'Small P3', priority: 'P3', storyPoints: 3, createdDate: sameDate },
      { id: '2', title: 'Large P3', priority: 'P3', storyPoints: 8, createdDate: sameDate },
    ];

    const result = suggestDeferrals(items, 5); // 11 points in 5 capacity

    expect(result[0].itemId).toBe('2'); // Larger item should be first
  });

  it('should return empty array when not over-committed', () => {
    const items: SprintItem[] = [
      { id: '1', title: 'Task', priority: 'P1', storyPoints: 5, createdDate: new Date() },
    ];

    const result = suggestDeferrals(items, 20);

    expect(result).toEqual([]);
  });

  it('should return empty array when at exactly 120% threshold', () => {
    const items: SprintItem[] = [
      { id: '1', title: 'Task', priority: 'P1', storyPoints: 24, createdDate: new Date() },
    ];

    const result = suggestDeferrals(items, 20); // 24/20 = 120%

    expect(result).toEqual([]);
  });

  it('should suggest items until sum >= excessPoints', () => {
    const items: SprintItem[] = [
      { id: '1', title: 'P1 Task', priority: 'P1', storyPoints: 10, createdDate: new Date() },
      { id: '2', title: 'P3 Task 1', priority: 'P3', storyPoints: 3, createdDate: new Date() },
      { id: '3', title: 'P3 Task 2', priority: 'P3', storyPoints: 3, createdDate: new Date() },
    ];

    const result = suggestDeferrals(items, 10); // 16 points in 10 capacity = 6 excess

    // Should suggest enough items to cover 6 excess points
    const totalSuggested = result.reduce((sum, s) => {
      const item = items.find(i => i.id === s.itemId);
      return sum + (item?.storyPoints || 3);
    }, 0);

    expect(totalSuggested).toBeGreaterThanOrEqual(6);
  });

  it('should include reason in suggestions', () => {
    const items: SprintItem[] = [
      { id: '1', title: 'P1 Task', priority: 'P1', storyPoints: 10, createdDate: new Date() },
      { id: '2', title: 'P3 Task', priority: 'P3', storyPoints: 5, createdDate: new Date() },
    ];

    const result = suggestDeferrals(items, 10);

    expect(result[0].reason).toBeDefined();
    expect(result[0].reason).toContain('Lowest priority');
  });

  it('should handle empty items array', () => {
    const result = suggestDeferrals([], 10);

    expect(result).toEqual([]);
  });
});
