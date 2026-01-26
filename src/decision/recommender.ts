/**
 * Recommendation generation with transparent reasoning.
 *
 * Transforms scored candidates into actionable recommendations with
 * narrative reasoning, effort estimates, first actions, and alternatives.
 */

import type { ScoredItem } from '../triage/types.js';
import type { TimeContext } from './time-context.js';
import type { DecisionCandidate, Recommendation, Alternative, DecisionResult } from './types.js';
import { selectCandidates } from './candidate-selector.js';
import { estimateEffort } from './effort-estimator.js';
import { generateFirstAction } from './first-action.js';
import { formatScoreHint } from '../formatters/score-explainer.js';

/**
 * Check if alternatives should be shown based on score difference.
 *
 * Only show alternatives when within 10% of top score to avoid
 * overwhelming user with too many options.
 *
 * @param topScore - Final score of top candidate
 * @param candidateScore - Final score of candidate to check
 * @returns True if within 10% score difference
 */
function shouldShowAlternatives(topScore: number, candidateScore: number): boolean {
  const threshold = topScore * 0.9; // 10% difference
  return candidateScore >= threshold;
}

/**
 * Generate alternative recommendations for close-scoring items.
 *
 * @param candidates - All candidates sorted by final score
 * @param topScore - Final score of top candidate
 * @returns Array of alternatives (empty if none within threshold)
 */
function generateAlternatives(
  candidates: DecisionCandidate[],
  topScore: number
): Alternative[] {
  // Skip first item (it's the recommendation)
  const remainingCandidates = candidates.slice(1);

  // Filter to items within 10% score difference
  const closeItems = remainingCandidates.filter((candidate) =>
    shouldShowAlternatives(topScore, candidate.finalScore)
  );

  // Generate one-liner summaries
  return closeItems.map((candidate) => {
    const { scored } = candidate;
    const title = scored.item.item.title;
    const scoreHint = formatScoreHint(scored.appliedRules);

    return {
      item: scored,
      oneLiner: scoreHint ? `${title} (${scoreHint})` : title,
    };
  });
}

/**
 * Extract context links (ticket URLs, PR URLs) from scored item.
 *
 * Note: CompressedWorkItem and CompressedPR don't include URLs
 * to reduce token usage. This returns an empty array for now.
 * Future enhancement: Could construct URLs from org/project/id if needed.
 *
 * @param item - Scored item with metadata
 * @returns Array of context links (currently empty)
 */
function extractContextLinks(item: ScoredItem): string[] {
  // Compressed types don't include URLs for token optimization
  // Could reconstruct from org/project/id if needed in the future
  return [];
}

/**
 * Build narrative reasoning for recommendation.
 *
 * Includes:
 * - Priority rules that contributed to score
 * - Time-fit explanation
 * - Context about the work
 * - Runner-ups if any
 *
 * @param candidate - Top candidate to build reasoning for
 * @param timeContext - Current time context
 * @param alternatives - Alternative options (if any)
 * @returns Narrative reasoning string
 */
function buildReasoning(
  candidate: DecisionCandidate,
  timeContext: TimeContext,
  alternatives: Alternative[]
): string {
  const { scored, workType, timeFit } = candidate;
  const parts: string[] = [];

  // Priority reasoning
  const scoreHint = formatScoreHint(scored.appliedRules);
  if (scoreHint) {
    parts.push(`This item scores highest on: ${scoreHint}`);
  } else {
    parts.push('This item has the highest priority score');
  }

  // Time-fit reasoning
  if (timeFit === 1.0) {
    parts.push(`Perfect time match: ${workType.reasoning.toLowerCase()}, and it's ${timeContext.mode} time (${timeContext.reasoning.toLowerCase()})`);
  } else if (timeFit >= 0.7) {
    parts.push(`Good time match: ${workType.reasoning.toLowerCase()} during ${timeContext.mode} time`);
  } else {
    parts.push(`Challenging time match: ${workType.reasoning.toLowerCase()} during ${timeContext.mode} time, but it's the highest priority`);
  }

  // Alternatives context
  if (alternatives.length > 0) {
    parts.push(`${alternatives.length} other item${alternatives.length > 1 ? 's' : ''} are similarly urgent if this one is blocked`);
  }

  return parts.join('. ') + '.';
}

/**
 * Generate recommendation from scored items and time context.
 *
 * Process:
 * 1. Select and score candidates with time-fit
 * 2. Check for no-work or low-confidence cases
 * 3. Build recommendation with reasoning, effort, action, alternatives
 *
 * @param scoredItems - Items with priority scores (sorted by score descending)
 * @param timeContext - Current time context
 * @returns Decision result (no-work | low-confidence | recommendation)
 */
export function generateRecommendation(
  scoredItems: ScoredItem[],
  timeContext: TimeContext
): DecisionResult {
  // No work available
  if (scoredItems.length === 0) {
    return {
      type: 'no-work',
      message: 'No work items or pull requests to recommend',
    };
  }

  // Select candidates with time-fit scoring
  const candidates = selectCandidates(scoredItems, timeContext);

  // Low confidence: Top candidate has score of 0
  const topCandidate = candidates[0];
  if (topCandidate.scored.score === 0) {
    return {
      type: 'low-confidence',
      topCandidate,
      reasoning: 'No priority rules matched for any items. Consider reviewing your priority configuration.',
    };
  }

  // Generate alternatives
  const alternatives = generateAlternatives(candidates, topCandidate.finalScore);

  // Build full recommendation
  const recommendation: Recommendation = {
    item: topCandidate.scored,
    reasoning: buildReasoning(topCandidate, timeContext, alternatives),
    effort: estimateEffort(topCandidate.scored),
    suggestedAction: generateFirstAction(topCandidate.scored),
    contextLinks: extractContextLinks(topCandidate.scored),
    alternatives,
  };

  return {
    type: 'recommendation',
    recommendation,
  };
}
