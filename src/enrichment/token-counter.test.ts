import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  truncateToTokenBudget,
  truncateComments,
} from './token-counter.js';
import type { ADOComment } from './types.js';

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('estimates tokens for short text', () => {
    expect(estimateTokens('hello')).toBe(2); // ceil(5/4) = 2
  });

  it('estimates tokens for 100 character string', () => {
    const text = 'a'.repeat(100);
    expect(estimateTokens(text)).toBe(25); // ceil(100/4) = 25
  });

  it('rounds up fractional tokens', () => {
    expect(estimateTokens('abc')).toBe(1); // ceil(3/4) = 1
    expect(estimateTokens('abcd')).toBe(1); // ceil(4/4) = 1
    expect(estimateTokens('abcde')).toBe(2); // ceil(5/4) = 2
  });
});

describe('truncateToTokenBudget', () => {
  it('returns text unchanged if under budget', () => {
    const text = 'Short text';
    expect(truncateToTokenBudget(text, 10)).toBe(text);
  });

  it('truncates at sentence boundary when possible', () => {
    const text = 'First sentence. Second sentence. Third sentence.';
    const result = truncateToTokenBudget(text, 5); // ~20 chars
    expect(result).toContain('First sentence.');
    expect(result).not.toContain('Second');
  });

  it('hard truncates with ellipsis when no sentence boundary', () => {
    const text = 'NoSentenceBoundariesHereJustOneLongWord';
    const result = truncateToTokenBudget(text, 5); // ~20 chars
    expect(result).toContain('..');
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it('handles exclamation and question marks as boundaries', () => {
    const text = 'Question? Answer! Statement.';
    const result = truncateToTokenBudget(text, 3); // ~12 chars
    expect(result).toMatch(/Question\?|Answer!/);
  });

  it('returns ellipsis for very small budgets', () => {
    const text = 'Some text';
    const result = truncateToTokenBudget(text, 0);
    expect(result).toBe('..');
  });
});

describe('truncateComments', () => {
  const createComment = (id: number, text: string): ADOComment => ({
    id,
    text,
    createdDate: '2026-01-27T00:00:00Z',
    createdBy: 'user@example.com',
  });

  it('returns empty array for empty input', () => {
    expect(truncateComments([], 100)).toEqual([]);
  });

  it('returns all comments if under budget', () => {
    const comments = [
      createComment(1, 'First'),
      createComment(2, 'Second'),
      createComment(3, 'Third'),
    ];
    const result = truncateComments(comments, 100);
    expect(result).toHaveLength(3);
    expect(result).toEqual(comments);
  });

  it('drops oldest comments first when over budget', () => {
    const comments = [
      createComment(1, 'Recent comment with text'),
      createComment(2, 'Older comment with text'),
      createComment(3, 'Oldest comment with text'),
    ];
    // Budget for ~2 comments (each comment ~60 chars = ~15 tokens + overhead)
    const result = truncateComments(comments, 40);
    expect(result.length).toBeLessThan(comments.length);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].id).toBe(1); // Most recent kept
    if (result.length > 1) {
      expect(result[1].id).toBe(2); // Second most recent
    }
  });

  it('accounts for metadata overhead in token estimation', () => {
    const comments = [createComment(1, 'x'.repeat(100))];
    // Comment text is 100 chars, plus metadata ~50 chars, plus overhead
    // Total ~150 chars = ~38 tokens
    const result = truncateComments(comments, 40);
    expect(result).toHaveLength(1); // Should fit

    const result2 = truncateComments(comments, 30);
    expect(result2).toHaveLength(0); // Should not fit
  });
});
