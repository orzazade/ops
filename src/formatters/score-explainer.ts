/**
 * Score explanation formatter for priority transparency.
 *
 * Provides prose explanations for item scores and concise hints
 * for inline display in briefings.
 */

import type { AppliedRule, ScoredItem } from '../triage/types.js';

/**
 * Convert rule name to human-readable format.
 *
 * @param ruleName - Snake case rule name
 * @returns Human-readable rule name
 */
function formatRuleName(ruleName: string): string {
  const ruleNameMap: Record<string, string> = {
    p1_priority: 'P1 priority',
    p2_priority: 'P2 priority',
    vip_involvement: 'VIP assigned',
    age_over_3_days: '3+ days old',
    blocking_others: 'blocking others',
    sprint_commitment: 'sprint commitment',
    carried_over: 'carried over',
    manual_boost: 'boosted',
    manual_demote: 'demoted',
  };

  return ruleNameMap[ruleName] || ruleName;
}

/**
 * Generate prose explanation for a scored item's priority.
 *
 * Example: "P1 priority (+2), VIP assigned (+3). Total: 5 (rank #3 of 15 items)"
 *
 * @param scoredItem - Item with score and applied rules
 * @param allItems - All scored items for rank calculation
 * @returns Prose explanation with rule names, weights, total, and rank
 */
export function explainScore(
  scoredItem: ScoredItem,
  allItems: ScoredItem[]
): string {
  const { score, appliedRules } = scoredItem;

  // Calculate rank (1-indexed position in allItems array)
  const rank = allItems.findIndex(
    (item) =>
      item.item === scoredItem.item ||
      (item.item.type === scoredItem.item.type &&
        item.item.type === 'work_item' &&
        scoredItem.item.type === 'work_item' &&
        item.item.item.id === scoredItem.item.item.id) ||
      (item.item.type === scoredItem.item.type &&
        item.item.type === 'pull_request' &&
        scoredItem.item.type === 'pull_request' &&
        item.item.item.id === scoredItem.item.item.id)
  ) + 1;

  const totalItems = allItems.length;

  // Handle empty rules case
  if (appliedRules.length === 0) {
    return `No scoring rules matched. Total: 0 (rank #${rank} of ${totalItems} items)`;
  }

  // Format each rule with human-readable name and signed weight
  const ruleExplanations = appliedRules.map((rule) => {
    const name = formatRuleName(rule.name);
    const sign = rule.weight >= 0 ? '+' : '';
    return `${name} (${sign}${rule.weight})`;
  });

  // Build prose explanation
  const rulesText = ruleExplanations.join(', ');
  return `${rulesText}. Total: ${score} (rank #${rank} of ${totalItems} items)`;
}

/**
 * Generate concise score hint for inline display.
 *
 * Takes top 2 rules by weight and formats them using short names.
 * Example: "P1+VIP", "VIP+blocking"
 *
 * @param appliedRules - Rules that contributed to score
 * @returns Concise hint string (empty if no rules)
 */
export function formatScoreHint(appliedRules: AppliedRule[]): string {
  if (appliedRules.length === 0) {
    return '';
  }

  // Short name mapping for concise display
  const shortNameMap: Record<string, string> = {
    p1_priority: 'P1',
    p2_priority: 'P2',
    vip_involvement: 'VIP',
    age_over_3_days: 'old',
    blocking_others: 'blocking',
    sprint_commitment: 'sprint',
    carried_over: 'carryover',
    manual_boost: 'boosted',
    manual_demote: 'demoted',
  };

  // Sort by absolute weight (highest first) and take top 2
  const topRules = [...appliedRules]
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 2)
    .map((rule) => shortNameMap[rule.name] || rule.name);

  return topRules.join('+');
}
