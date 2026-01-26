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

  describe('overflow handling', () => {
    it('drops lower priority section to fit', () => {
      const budget = new TokenBudget(1000);
      budget.allocate('low', 400, 3);
      budget.allocate('med', 400, 5);
      // Now at 800, want to add 300 at priority 7

      const result = budget.handleOverflow('high', 300, 7);
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual(['low']); // dropped low priority
      expect(budget.hasAllocation('low')).toBe(false);
      expect(budget.hasAllocation('med')).toBe(true);
      expect(budget.remaining()).toBe(600); // 1000 - 400 (med kept)
    });

    it('drops multiple sections in priority order', () => {
      const budget = new TokenBudget(1000);
      budget.allocate('p1', 300, 1);
      budget.allocate('p2', 300, 2);
      budget.allocate('p3', 300, 3);
      // At 900, want 500 at priority 5

      const result = budget.handleOverflow('high', 500, 5);
      expect(result.isOk()).toBe(true);
      const dropped = result._unsafeUnwrap();
      expect(dropped).toContain('p1');
      expect(dropped).toContain('p2');
      expect(budget.hasAllocation('p3')).toBe(true);
    });

    it('fails when no lower priority sections', () => {
      const budget = new TokenBudget(1000);
      budget.allocate('high', 800, 10);

      const result = budget.handleOverflow('new', 300, 5);
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().section).toBe('new');
    });

    it('fails when cannot free enough', () => {
      const budget = new TokenBudget(1000);
      budget.allocate('high', 900, 10);
      budget.allocate('low', 50, 1);

      const result = budget.handleOverflow('new', 200, 5);
      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error.shortfall).toBe(100); // need 200, have 100 remaining after freeing 50
    });
  });
});
