import { describe, it, expect } from 'vitest';
import { getTimeContext } from './time-context.js';

describe('getTimeContext', () => {
  it('returns deep mode for 8am weekday', () => {
    // Tuesday 8am UTC
    const date = new Date('2026-01-27T08:00:00Z');
    const ctx = getTimeContext(date);
    expect(ctx.mode).toBe('deep');
    expect(ctx.reasoning).toContain('focus');
  });

  it('returns deep mode for 10am weekday', () => {
    // Tuesday 10am UTC
    const date = new Date('2026-01-27T10:00:00Z');
    const ctx = getTimeContext(date);
    expect(ctx.mode).toBe('deep');
    expect(ctx.reasoning).toContain('focus');
  });

  it('returns meeting mode for 11am weekday', () => {
    // Tuesday 11am UTC
    const date = new Date('2026-01-27T11:00:00Z');
    const ctx = getTimeContext(date);
    expect(ctx.mode).toBe('meeting');
    expect(ctx.reasoning).toContain('collaboration');
  });

  it('returns meeting mode for 1pm weekday', () => {
    // Tuesday 1pm UTC
    const date = new Date('2026-01-27T13:00:00Z');
    const ctx = getTimeContext(date);
    expect(ctx.mode).toBe('meeting');
    expect(ctx.reasoning).toContain('collaboration');
  });

  it('returns admin mode for 2pm weekday', () => {
    // Tuesday 2pm UTC
    const date = new Date('2026-01-27T14:00:00Z');
    const ctx = getTimeContext(date);
    expect(ctx.mode).toBe('admin');
    expect(ctx.reasoning).toContain('admin');
  });

  it('returns admin mode for 4pm weekday', () => {
    // Tuesday 4pm UTC
    const date = new Date('2026-01-27T16:00:00Z');
    const ctx = getTimeContext(date);
    expect(ctx.mode).toBe('admin');
    expect(ctx.reasoning).toContain('admin');
  });

  it('returns after-hours mode for 6pm weekday', () => {
    // Tuesday 6pm UTC
    const date = new Date('2026-01-27T18:00:00Z');
    const ctx = getTimeContext(date);
    expect(ctx.mode).toBe('after-hours');
    expect(ctx.reasoning).toContain('Outside normal work hours');
  });

  it('returns after-hours mode for early morning', () => {
    // Tuesday 6am UTC
    const date = new Date('2026-01-27T06:00:00Z');
    const ctx = getTimeContext(date);
    expect(ctx.mode).toBe('after-hours');
    expect(ctx.reasoning).toContain('Outside normal work hours');
  });

  it('returns after-hours mode for weekend', () => {
    // Saturday 10am UTC
    const date = new Date('2026-01-31T10:00:00Z');
    const ctx = getTimeContext(date);
    expect(ctx.mode).toBe('after-hours');
    expect(ctx.reasoning).toContain('Outside normal work hours');
  });

  it('includes suggested duration in all modes', () => {
    const date = new Date('2026-01-27T08:00:00Z');
    const ctx = getTimeContext(date);
    expect(ctx.suggestedDuration).toBeDefined();
    expect(typeof ctx.suggestedDuration).toBe('string');
  });
});
