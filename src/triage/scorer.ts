/**
 * Priority scoring implementation for triage system.
 *
 * Evaluates work items and pull requests against configurable rules
 * to produce priority scores for briefing generation.
 */

import type { OpsConfig } from '../config/schema.js';
import type {
  ScoreableItem,
  ScoreableWorkItem,
  ScoreablePR,
  ScoredItem,
  ScoringRule,
  AppliedRule,
} from './types.js';
import { applyOverrides, type Override } from './overrides.js';

/**
 * Scoring rules for work items.
 * Each rule checks specific conditions and uses config weight if matched.
 */
const WORK_ITEM_RULES: ScoringRule<ScoreableWorkItem>[] = [
  {
    name: 'p1_priority',
    evaluate: (item) => item.item.priority === 1,
  },
  {
    name: 'p2_priority',
    evaluate: (item) => item.item.priority === 2,
  },
  // Note: blocking_others, sprint_commitment, age_over_3_days, carried_over
  // require additional context not available in CompressedWorkItem.
  // These will be added in Plan 02 with state tracking.
];

/**
 * Scoring rules for pull requests.
 * Only VIP involvement applies to PRs (checked against author).
 */
const PR_RULES: ScoringRule<ScoreablePR>[] = [
  // VIP involvement handled separately via matchesVip helper
];

/**
 * Priority scorer for work items and pull requests.
 *
 * Evaluates items against configurable rules and produces scores
 * for triage prioritization.
 */
export class PriorityScorer {
  private config: OpsConfig;

  constructor(config: OpsConfig) {
    this.config = config;
  }

  /**
   * Score a single item against all applicable rules.
   *
   * @param item - Work item or PR to score
   * @returns Scored item with total score and applied rules
   */
  score<T extends ScoreableItem>(item: T): ScoredItem<T> {
    const appliedRules: AppliedRule[] = [];
    let totalScore = 0;

    if (item.type === 'work_item') {
      // Apply work item rules
      for (const rule of WORK_ITEM_RULES) {
        if (rule.evaluate(item as ScoreableWorkItem)) {
          const weight = this.config.priorities[rule.name];
          appliedRules.push({ name: rule.name, weight });
          totalScore += weight;
        }
      }

      // Check VIP involvement for work item assignee
      if (item.item.assignedTo && this.matchesVip(item.item.assignedTo)) {
        const weight = this.config.priorities.vip_involvement;
        appliedRules.push({ name: 'vip_involvement', weight });
        totalScore += weight;
      }
    } else if (item.type === 'pull_request') {
      // Apply PR rules (currently just VIP check)
      for (const rule of PR_RULES) {
        if (rule.evaluate(item as ScoreablePR)) {
          const weight = this.config.priorities[rule.name];
          appliedRules.push({ name: rule.name, weight });
          totalScore += weight;
        }
      }

      // Check VIP involvement for PR author
      if (this.matchesVip(item.item.author)) {
        const weight = this.config.priorities.vip_involvement;
        appliedRules.push({ name: 'vip_involvement', weight });
        totalScore += weight;
      }
    }

    return {
      item,
      score: totalScore,
      appliedRules,
    };
  }

  /**
   * Score multiple items and sort by score descending.
   *
   * @param items - Array of items to score
   * @returns Sorted array of scored items (highest score first)
   */
  scoreAll(items: ScoreableItem[]): ScoredItem[] {
    const scored = items.map((item) => this.score(item));

    // Sort descending by score
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Score multiple items, apply overrides, and sort by score descending.
   *
   * @param items - Array of items to score
   * @param overrides - Optional overrides to apply after scoring
   * @returns Sorted array of scored items (highest score first)
   */
  scoreAllWithOverrides(items: ScoreableItem[], overrides: Override[] = []): ScoredItem[] {
    const scored = items.map((item) => this.score(item));

    // Apply overrides
    const withOverrides = applyOverrides(scored, overrides);

    // Sort descending by score
    return withOverrides.sort((a, b) => b.score - a.score);
  }

  /**
   * Check if a name matches any VIP in config.
   * Uses case-insensitive partial matching (contains).
   *
   * @param name - Name to check against VIP list
   * @returns True if name matches any VIP
   */
  private matchesVip(name: string): boolean {
    if (!name) return false;

    const normalizedName = name.toLowerCase().trim();

    return this.config.vips.some((vip) => {
      const normalizedVip = vip.name.toLowerCase().trim();

      // Check if either name contains the other (partial match)
      return (
        normalizedName.includes(normalizedVip) ||
        normalizedVip.includes(normalizedName)
      );
    });
  }
}
