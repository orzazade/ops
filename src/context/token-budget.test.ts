import { describe, it, expect } from 'vitest';
import { TokenBudget } from './token-budget.js';

describe('TokenBudget', () => {
  describe('basic allocation', () => {
    it('starts with full capacity', () => {
      const budget = new TokenBudget(1000);
      expect(budget.remaining()).toBe(1000);
      expect(budget.used()).toBe(0);
    });

    it('tracks allocation', () => {
      const budget = new TokenBudget(1000);
      budget.allocate('section1', 300, 5);
      expect(budget.remaining()).toBe(700);
      expect(budget.used()).toBe(300);
    });

    it('canAllocate returns true when space available', () => {
      const budget = new TokenBudget(1000);
      expect(budget.canAllocate(500)).toBe(true);
    });

    it('canAllocate returns false when over budget', () => {
      const budget = new TokenBudget(1000);
      budget.allocate('section1', 800, 5);
      expect(budget.canAllocate(300)).toBe(false);
    });

    it('hasAllocation tracks sections', () => {
      const budget = new TokenBudget(1000);
      budget.allocate('section1', 300, 5);
      expect(budget.hasAllocation('section1')).toBe(true);
      expect(budget.hasAllocation('section2')).toBe(false);
    });
  });
});
