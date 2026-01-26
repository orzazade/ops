import { describe, it, expect } from 'vitest';
import { getTimeContext } from './time-context.js';

describe('getTimeContext', () => {
  it('returns deep mode for 8am weekday', () => {
    // Tuesday 8am local time
    const date = new Date(2026, 0, 27, 8, 0, 0);
    const ctx = getTimeContext(date);
    expect(ctx.mode).toBe('deep');
    expect(ctx.reasoning).toContain('focus');
  });

  it('returns deep mode for 10am weekday', () => {
    // Tuesday 10am local time
    const date = new Date(2026, 0, 27, 10, 0, 0);
    const ctx = getTimeContext(date);
    expect(ctx.mode).toBe('deep');
    expect(ctx.reasoning).toContain('focus');
  });

  it('returns meeting mode for 11am weekday', () => {
    // Tuesday 11am local time
    const date = new Date(2026, 0, 27, 11, 0, 0);
    const ctx = getTimeContext(date);
    expect(ctx.mode).toBe('meeting');
    expect(ctx.reasoning).toContain('collaboration');
  });

  it('returns meeting mode for 1pm weekday', () => {
    // Tuesday 1pm local time
    const date = new Date(2026, 0, 27, 13, 0, 0);
    const ctx = getTimeContext(date);
    expect(ctx.mode).toBe('meeting');
    expect(ctx.reasoning).toContain('collaboration');
  });

  it('returns admin mode for 2pm weekday', () => {
    // Tuesday 2pm local time
    const date = new Date(2026, 0, 27, 14, 0, 0);
    const ctx = getTimeContext(date);
    expect(ctx.mode).toBe('admin');
    expect(ctx.reasoning).toContain('admin');
  });

  it('returns admin mode for 4pm weekday', () => {
    // Tuesday 4pm local time
    const date = new Date(2026, 0, 27, 16, 0, 0);
    const ctx = getTimeContext(date);
    expect(ctx.mode).toBe('admin');
    expect(ctx.reasoning).toContain('admin');
  });

  it('returns after-hours mode for 6pm weekday', () => {
    // Tuesday 6pm local time
    const date = new Date(2026, 0, 27, 18, 0, 0);
    const ctx = getTimeContext(date);
    expect(ctx.mode).toBe('after-hours');
    expect(ctx.reasoning).toContain('Outside normal work hours');
  });

  it('returns after-hours mode for early morning', () => {
    // Tuesday 6am local time
    const date = new Date(2026, 0, 27, 6, 0, 0);
    const ctx = getTimeContext(date);
    expect(ctx.mode).toBe('after-hours');
    expect(ctx.reasoning).toContain('Outside normal work hours');
  });

  it('returns after-hours mode for weekend', () => {
    // Saturday 10am local time
    const date = new Date(2026, 0, 31, 10, 0, 0);
    const ctx = getTimeContext(date);
    expect(ctx.mode).toBe('after-hours');
    expect(ctx.reasoning).toContain('Outside normal work hours');
  });

  it('includes suggested duration in all modes', () => {
    const date = new Date(2026, 0, 27, 8, 0, 0);
    const ctx = getTimeContext(date);
    expect(ctx.suggestedDuration).toBeDefined();
    expect(typeof ctx.suggestedDuration).toBe('string');
  });
});
