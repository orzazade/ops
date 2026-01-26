/**
 * TUI display utilities for sprint intelligence.
 * Formats items for checkbox selection and capacity headers.
 */

import type { SprintItem, LoadAnalysis } from './types.js';
import { renderCapacityBar } from '../formatters/progress-bar.js';

/**
 * Format a sprint item for checkbox display.
 * Shows: ID, truncated title, points, priority, age
 */
export function formatSprintItem(item: SprintItem): string {
  const points = item.storyPoints;
  const pointsLabel = `${points}pts`;
  const priority = item.priority ? `P${item.priority}` : 'P-';
  const age = `${item.age}d`;
  const title = item.title.length > 45 ? item.title.slice(0, 42) + '...' : item.title;

  return `#${item.id} ${title} | ${pointsLabel} | ${priority} | ${age}`;
}

/**
 * Format sprint items as checkbox choices for @inquirer/checkbox.
 */
export function formatSprintChoices(items: SprintItem[]): Array<{
  name: string;
  value: number;
  checked: boolean;
}> {
  return items.map(item => ({
    name: formatSprintItem(item),
    value: item.id,
    checked: false,
  }));
}

/**
 * Format the capacity header for sprint display.
 * Shows sprint name, progress bar, and over-commitment warning.
 */
export function formatCapacityHeader(
  sprintName: string,
  analysis: LoadAnalysis
): string {
  const lines: string[] = [];

  lines.push(`\n${'='.repeat(60)}`);
  lines.push(` SPRINT: ${sprintName}`);
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(renderCapacityBar(analysis.currentCapacity, analysis.maxCapacity));

  if (analysis.isOverCommitted) {
    lines.push('\n\x1b[31m\u26A0\uFE0F  Sprint is OVER-COMMITTED (>120% capacity)\x1b[0m');
    lines.push(`   Excess: ${analysis.excessPoints} points over capacity`);
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Format selection summary for running totals.
 * Used in checkbox theme's renderSelectedChoices.
 */
export function formatSelectionSummary(
  selectedIds: number[],
  items: SprintItem[]
): string {
  const selectedItems = items.filter(i => selectedIds.includes(i.id));
  const totalPoints = selectedItems.reduce((sum, item) => sum + item.storyPoints, 0);

  return `${selectedIds.length} items selected (${totalPoints} points)`;
}

/**
 * Format deferral suggestions for display.
 */
export function formatDeferralSuggestions(
  suggestions: Array<{ item: SprintItem; reason: string }>
): string {
  if (suggestions.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push('\n\x1b[33mSuggested deferrals:\x1b[0m');

  for (const { item, reason } of suggestions) {
    lines.push(`  - #${item.id}: ${item.title.slice(0, 40)}... (${reason})`);
  }

  return lines.join('\n');
}
