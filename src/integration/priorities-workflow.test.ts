/**
 * Tests for priorities workflow helper functions.
 * Full integration tests would require complex mocking - testing helpers separately.
 */

import { describe, it, expect } from 'vitest';
import { isSameDay, formatTimeSince } from './priorities-workflow.js';

describe('isSameDay', () => {
  it('returns true for same day in UTC', () => {
    const date1 = new Date('2024-01-15T10:30:00Z');
    const date2 = new Date('2024-01-15T23:45:00Z');
    expect(isSameDay(date1, date2)).toBe(true);
  });

  it('returns false for different days', () => {
    const date1 = new Date('2024-01-15T23:30:00Z');
    const date2 = new Date('2024-01-16T00:30:00Z');
    expect(isSameDay(date1, date2)).toBe(false);
  });

  it('returns false for different months', () => {
    const date1 = new Date('2024-01-31T12:00:00Z');
    const date2 = new Date('2024-02-01T12:00:00Z');
    expect(isSameDay(date1, date2)).toBe(false);
  });

  it('returns false for different years', () => {
    const date1 = new Date('2023-12-31T12:00:00Z');
    const date2 = new Date('2024-01-01T12:00:00Z');
    expect(isSameDay(date1, date2)).toBe(false);
  });

  it('handles timezone differences correctly', () => {
    // These are the same UTC day despite different local representations
    const date1 = new Date('2024-01-15T00:00:00Z');
    const date2 = new Date('2024-01-15T23:59:59Z');
    expect(isSameDay(date1, date2)).toBe(true);
  });
});

describe('formatTimeSince', () => {
  it('formats time difference in minutes', () => {
    const now = Date.now();
    const fiveMinutesAgo = new Date(now - 5 * 60 * 1000).toISOString();
    expect(formatTimeSince(fiveMinutesAgo)).toBe('5 minutes ago');
  });

  it('formats single minute correctly', () => {
    const now = Date.now();
    const oneMinuteAgo = new Date(now - 1 * 60 * 1000).toISOString();
    expect(formatTimeSince(oneMinuteAgo)).toBe('1 minute ago');
  });

  it('formats time difference in hours', () => {
    const now = Date.now();
    const threeHoursAgo = new Date(now - 3 * 60 * 60 * 1000).toISOString();
    expect(formatTimeSince(threeHoursAgo)).toBe('3 hours ago');
  });

  it('formats single hour correctly', () => {
    const now = Date.now();
    const oneHourAgo = new Date(now - 1 * 60 * 60 * 1000).toISOString();
    expect(formatTimeSince(oneHourAgo)).toBe('1 hour ago');
  });

  it('formats time difference in days', () => {
    const now = Date.now();
    const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatTimeSince(twoDaysAgo)).toBe('2 days ago');
  });

  it('formats single day correctly', () => {
    const now = Date.now();
    const oneDayAgo = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatTimeSince(oneDayAgo)).toBe('1 day ago');
  });

  it('returns "just now" for very recent timestamps', () => {
    const now = new Date().toISOString();
    expect(formatTimeSince(now)).toBe('just now');
  });

  it('prefers larger units (hours over minutes)', () => {
    const now = Date.now();
    const ninetyMinutesAgo = new Date(now - 90 * 60 * 1000).toISOString();
    expect(formatTimeSince(ninetyMinutesAgo)).toBe('1 hour ago');
  });

  it('prefers larger units (days over hours)', () => {
    const now = Date.now();
    const thirtyHoursAgo = new Date(now - 30 * 60 * 60 * 1000).toISOString();
    expect(formatTimeSince(thirtyHoursAgo)).toBe('1 day ago');
  });
});
