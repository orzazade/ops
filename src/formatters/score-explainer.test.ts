import { describe, it, expect } from 'vitest';
import { explainScore, formatScoreHint } from './score-explainer.js';
import type { ScoredItem, ScoreableWorkItem } from '../triage/types.js';

describe('explainScore', () => {
  it('formats prose explanation with rank', () => {
    const item: ScoredItem = {
      item: {
        type: 'work_item',
        item: {
          id: 123,
          title: 'Test',
          state: 'Active',
          priority: 1,
        },
      } as ScoreableWorkItem,
      score: 5,
      appliedRules: [
        { name: 'p1_priority', weight: 2 },
        { name: 'vip_involvement', weight: 3 },
      ],
    };
    const result = explainScore(item, [item]);
    expect(result).toContain('P1 priority (+2)');
    expect(result).toContain('VIP assigned (+3)');
    expect(result).toContain('Total: 5');
    expect(result).toContain('rank #1 of 1');
  });

  it('handles negative weights', () => {
    const item: ScoredItem = {
      item: {
        type: 'work_item',
        item: {
          id: 123,
          title: 'Test',
          state: 'Active',
          priority: 1,
        },
      } as ScoreableWorkItem,
      score: -1,
      appliedRules: [{ name: 'manual_demote', weight: -1 }],
    };
    const result = explainScore(item, [item]);
    expect(result).toContain('demoted (-1)');
    expect(result).toContain('Total: -1');
  });

  it('handles empty rules', () => {
    const item: ScoredItem = {
      item: {
        type: 'work_item',
        item: {
          id: 123,
          title: 'Test',
          state: 'Active',
          priority: 3,
        },
      } as ScoreableWorkItem,
      score: 0,
      appliedRules: [],
    };
    const result = explainScore(item, [item]);
    expect(result).toBe('No scoring rules matched. Total: 0 (rank #1 of 1 items)');
  });

  it('calculates correct rank for multiple items', () => {
    const items: ScoredItem[] = [
      {
        item: {
          type: 'work_item',
          item: { id: 1, title: 'High', state: 'Active', priority: 1 },
        } as ScoreableWorkItem,
        score: 10,
        appliedRules: [{ name: 'p1_priority', weight: 10 }],
      },
      {
        item: {
          type: 'work_item',
          item: { id: 2, title: 'Medium', state: 'Active', priority: 2 },
        } as ScoreableWorkItem,
        score: 5,
        appliedRules: [{ name: 'p2_priority', weight: 5 }],
      },
      {
        item: {
          type: 'work_item',
          item: { id: 3, title: 'Low', state: 'Active', priority: 3 },
        } as ScoreableWorkItem,
        score: 0,
        appliedRules: [],
      },
    ];

    expect(explainScore(items[0], items)).toContain('rank #1 of 3');
    expect(explainScore(items[1], items)).toContain('rank #2 of 3');
    expect(explainScore(items[2], items)).toContain('rank #3 of 3');
  });
});

describe('formatScoreHint', () => {
  it('formats top 2 rules with short names', () => {
    const rules = [
      { name: 'p1_priority', weight: 2 },
      { name: 'vip_involvement', weight: 3 },
      { name: 'sprint_commitment', weight: 1 },
    ];
    const result = formatScoreHint(rules);
    expect(result).toBe('VIP+P1'); // VIP has highest weight (3)
  });

  it('handles single rule', () => {
    const rules = [{ name: 'p1_priority', weight: 2 }];
    const result = formatScoreHint(rules);
    expect(result).toBe('P1');
  });

  it('returns empty string for no rules', () => {
    const result = formatScoreHint([]);
    expect(result).toBe('');
  });

  it('uses short names correctly', () => {
    const rules = [
      { name: 'blocking_others', weight: 5 },
      { name: 'age_over_3_days', weight: 2 },
    ];
    const result = formatScoreHint(rules);
    expect(result).toBe('blocking+old');
  });
});
