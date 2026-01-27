/**
 * Token counting and truncation utilities for enrichment.
 *
 * Provides utilities to estimate token counts (4 chars/token heuristic)
 * and truncate text to fit within token budgets while preserving
 * sentence boundaries.
 */

import type { ADOComment } from './types.js';

/**
 * Estimate token count for text using 4 chars/token heuristic.
 * This is a rough approximation - actual token counts vary by model.
 *
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) {
    return 0;
  }
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token budget.
 * Attempts to preserve sentence boundaries when possible.
 *
 * @param text - Text to truncate
 * @param maxTokens - Maximum token budget
 * @returns Truncated text with ellipsis if truncated
 */
export function truncateToTokenBudget(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text);

  if (estimatedTokens <= maxTokens) {
    return text;
  }

  // Calculate character limit (4 chars per token, minus space for ellipsis)
  const charLimit = maxTokens * 4 - 2; // Reserve 2 chars for '..'

  if (charLimit <= 0) {
    return '..';
  }

  // Try to find last sentence boundary before limit
  const textToSearch = text.substring(0, charLimit);
  const sentenceBoundaries = ['. ', '! ', '? '];

  let lastBoundaryIndex = -1;
  for (const boundary of sentenceBoundaries) {
    const index = textToSearch.lastIndexOf(boundary);
    if (index > lastBoundaryIndex) {
      lastBoundaryIndex = index;
    }
  }

  // If we found a sentence boundary, truncate there
  if (lastBoundaryIndex > 0) {
    return text.substring(0, lastBoundaryIndex + 1) + '.';
  }

  // Otherwise, hard truncate
  return text.substring(0, charLimit) + '..';
}

/**
 * Truncate comment array to fit within token budget.
 * Removes oldest comments first (from end of array).
 * Assumes comments are ordered with most recent first.
 *
 * @param comments - Comments to truncate (most recent first)
 * @param maxTokens - Maximum token budget
 * @returns Truncated comment array
 */
export function truncateComments(
  comments: ADOComment[],
  maxTokens: number
): ADOComment[] {
  if (comments.length === 0) {
    return [];
  }

  const result: ADOComment[] = [];
  let usedTokens = 0;

  // Iterate from most recent (start) to oldest (end)
  for (const comment of comments) {
    // Estimate tokens for comment (text + metadata overhead ~20 chars)
    const commentText = comment.text + comment.createdBy + comment.createdDate;
    const commentTokens = estimateTokens(commentText) + 5; // ~20 char overhead / 4

    if (usedTokens + commentTokens <= maxTokens) {
      result.push(comment);
      usedTokens += commentTokens;
    } else {
      // Would exceed budget, stop here
      break;
    }
  }

  return result;
}
