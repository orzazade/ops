/**
 * Tests for carryover logic.
 * RED phase: These tests should fail initially.
 */

import { describe, it, expect } from 'vitest';
import type { Briefing, BriefingItem } from '../triage/schemas.js';
import { identifyCarryover } from './carryover.js';

describe('identifyCarryover', () => {
  const createItem = (id: number, title: string): BriefingItem => ({
    id,
    type: 'work_item',
    title,
    priority_reason: 'Test reason',
    needs_response: false,
  });

  it('should return all items as new when no yesterday briefing', () => {
    const todayItems: BriefingItem[] = [
      createItem(1, 'Item 1'),
      createItem(2, 'Item 2'),
      createItem(3, 'Item 3'),
    ];

    const result = identifyCarryover(todayItems, undefined);

    expect(result.carryover).toEqual([]);
    expect(result.new).toEqual(todayItems);
  });

  it('should return all items as new when yesterday briefing has no items', () => {
    const todayItems: BriefingItem[] = [
      createItem(1, 'Item 1'),
      createItem(2, 'Item 2'),
    ];

    const yesterdayBriefing: Briefing = {
      summary: 'Yesterday',
      top_priorities: [],
      needs_response: [],
      timestamp: '2026-01-25T10:00:00Z',
    };

    const result = identifyCarryover(todayItems, yesterdayBriefing);

    expect(result.carryover).toEqual([]);
    expect(result.new).toEqual(todayItems);
  });

  it('should partition items based on presence in yesterday', () => {
    const todayItems: BriefingItem[] = [
      createItem(1, 'Item 1'), // In yesterday
      createItem(2, 'Item 2'), // New
      createItem(3, 'Item 3'), // In yesterday
      createItem(4, 'Item 4'), // New
    ];

    const yesterdayBriefing: Briefing = {
      summary: 'Yesterday',
      top_priorities: [
        createItem(1, 'Item 1'),
        createItem(3, 'Item 3'),
      ],
      needs_response: [],
      timestamp: '2026-01-25T10:00:00Z',
    };

    const result = identifyCarryover(todayItems, yesterdayBriefing);

    expect(result.carryover).toHaveLength(2);
    expect(result.carryover).toEqual([
      createItem(1, 'Item 1'),
      createItem(3, 'Item 3'),
    ]);

    expect(result.new).toHaveLength(2);
    expect(result.new).toEqual([createItem(2, 'Item 2'), createItem(4, 'Item 4')]);
  });

  it('should check both top_priorities and needs_response for carryover', () => {
    const todayItems: BriefingItem[] = [
      createItem(1, 'Item 1'), // In top_priorities
      createItem(2, 'Item 2'), // In needs_response
      createItem(3, 'Item 3'), // New
    ];

    const yesterdayBriefing: Briefing = {
      summary: 'Yesterday',
      top_priorities: [createItem(1, 'Item 1')],
      needs_response: [
        { ...createItem(2, 'Item 2'), needs_response: true },
      ],
      timestamp: '2026-01-25T10:00:00Z',
    };

    const result = identifyCarryover(todayItems, yesterdayBriefing);

    expect(result.carryover).toHaveLength(2);
    expect(result.carryover.map((i) => i.id)).toEqual([1, 2]);

    expect(result.new).toHaveLength(1);
    expect(result.new[0].id).toBe(3);
  });

  it('should handle empty today items', () => {
    const yesterdayBriefing: Briefing = {
      summary: 'Yesterday',
      top_priorities: [createItem(1, 'Item 1')],
      needs_response: [],
      timestamp: '2026-01-25T10:00:00Z',
    };

    const result = identifyCarryover([], yesterdayBriefing);

    expect(result.carryover).toEqual([]);
    expect(result.new).toEqual([]);
  });

  it('should handle items that appear in both top_priorities and needs_response', () => {
    const todayItems: BriefingItem[] = [
      createItem(1, 'Item 1'),
      createItem(2, 'Item 2'),
    ];

    const yesterdayBriefing: Briefing = {
      summary: 'Yesterday',
      top_priorities: [createItem(1, 'Item 1')],
      needs_response: [
        { ...createItem(1, 'Item 1'), needs_response: true }, // Same ID as top_priorities
      ],
      timestamp: '2026-01-25T10:00:00Z',
    };

    const result = identifyCarryover(todayItems, yesterdayBriefing);

    // Item 1 should only appear once in carryover (deduped)
    expect(result.carryover).toHaveLength(1);
    expect(result.carryover[0].id).toBe(1);

    expect(result.new).toHaveLength(1);
    expect(result.new[0].id).toBe(2);
  });

  it('should use Set for O(1) lookup performance', () => {
    // This is more of a performance test - verifying the implementation uses Set
    // We can verify by testing with many items and ensuring it completes quickly
    const todayItems: BriefingItem[] = Array.from({ length: 100 }, (_, i) =>
      createItem(i, `Item ${i}`)
    );

    const yesterdayBriefing: Briefing = {
      summary: 'Yesterday',
      top_priorities: Array.from({ length: 50 }, (_, i) =>
        createItem(i * 2, `Item ${i * 2}`)
      ).slice(0, 5), // Only first 5 (schema limit)
      needs_response: [],
      timestamp: '2026-01-25T10:00:00Z',
    };

    const start = Date.now();
    const result = identifyCarryover(todayItems, yesterdayBriefing);
    const duration = Date.now() - start;

    // Should complete in less than 10ms for 100 items
    expect(duration).toBeLessThan(10);

    // Verify correctness
    expect(result.carryover.length + result.new.length).toBe(100);
  });
});
