/**
 * Rules table formatter for priority transparency.
 *
 * Displays scoring rules grouped by category in markdown table format.
 */

import { markdownTable } from 'markdown-table';
import type { OpsConfig } from '../config/schema.js';

/**
 * Format rule name for display.
 * Same mapping as score-explainer for consistency.
 */
function formatRuleName(ruleName: string): string {
  const ruleNameMap: Record<string, string> = {
    p1_priority: 'P1 priority',
    p2_priority: 'P2 priority',
    vip_involvement: 'VIP assigned',
    age_over_3_days: '3+ days old',
    blocking_others: 'Blocking others',
    sprint_commitment: 'Sprint commitment',
    carried_over: 'Carried over',
  };

  return ruleNameMap[ruleName] || ruleName;
}

/**
 * Rule category definitions.
 * Each category groups related scoring rules.
 */
interface RuleCategory {
  name: string;
  rules: string[];
}

const CATEGORIES: RuleCategory[] = [
  {
    name: 'Priority',
    rules: ['p1_priority', 'p2_priority'],
  },
  {
    name: 'People',
    rules: ['vip_involvement'],
  },
  {
    name: 'Age',
    rules: ['age_over_3_days'],
  },
  {
    name: 'State',
    rules: ['sprint_commitment', 'blocking_others', 'carried_over'],
  },
];

/**
 * Format scoring rules in grouped table format.
 *
 * Groups rules by category (Priority, People, Age, State) and displays
 * each category with a markdown table showing rule names and weights.
 *
 * @param priorities - Priority configuration object with rule weights
 * @returns Formatted rules table with category sections
 */
export function formatRulesTable(
  priorities: OpsConfig['priorities']
): string {
  const sections: string[] = [];

  for (const category of CATEGORIES) {
    // Build table data for this category
    const tableData: string[][] = [
      ['Rule', 'Weight'], // Header row
    ];

    for (const ruleName of category.rules) {
      const weight = priorities[ruleName as keyof typeof priorities];
      const displayName = formatRuleName(ruleName);
      tableData.push([displayName, String(weight)]);
    }

    // Format section with header and table
    const table = markdownTable(tableData);
    sections.push(`## ${category.name}\n\n${table}`);
  }

  return sections.join('\n\n');
}
