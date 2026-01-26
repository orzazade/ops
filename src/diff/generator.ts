import { diffLines, Change } from 'diff';
import type { WorkItemWithRelations, WorkItemUpdate } from '../investigators/types.js';

/**
 * Normalizes line endings to LF for consistent diff output.
 */
export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

/**
 * Formats a diff between two texts with unified-style output.
 * Lines are prefixed with +, -, or space for added, removed, or unchanged.
 */
export function formatDiff(oldText: string, newText: string): string {
  const normalizedOld = normalizeLineEndings(oldText);
  const normalizedNew = normalizeLineEndings(newText);

  const changes = diffLines(normalizedOld, normalizedNew);
  const lines: string[] = [];

  for (const part of changes) {
    const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
    const partLines = part.value.split('\n').filter(line => line.length > 0);

    for (const line of partLines) {
      lines.push(prefix + line);
    }
  }

  return lines.join('\n');
}

/**
 * Shows a labeled diff between old and new text.
 * Prints nothing if texts are identical.
 */
export function showDiff(label: string, oldText: string, newText: string): void {
  if (oldText === newText) {
    console.log(`${label}: [no changes]`);
    return;
  }

  console.log(`\n${label}:`);
  console.log(formatDiff(oldText, newText));
}

/**
 * Generates diffs for work item updates.
 */
export class DiffGenerator {
  /**
   * Generates a formatted diff showing changes to work item fields.
   * Returns a string with all changed sections labeled and formatted.
   */
  generateWorkItemDiff(
    original: WorkItemWithRelations,
    updates: WorkItemUpdate
  ): string {
    const sections: string[] = [];

    // Compare description
    if (updates.description !== undefined) {
      const oldDesc = original.description || '';
      const newDesc = updates.description;

      if (oldDesc !== newDesc) {
        sections.push('📝 Description Changes:');
        sections.push(formatDiff(oldDesc, newDesc));
      }
    }

    // Compare acceptance criteria
    if (updates.acceptanceCriteria !== undefined) {
      const oldAC = original.acceptanceCriteria || '';
      const newAC = updates.acceptanceCriteria;

      if (oldAC !== newAC) {
        sections.push('\n✓ Acceptance Criteria Changes:');
        sections.push(formatDiff(oldAC, newAC));
      }
    }

    // Show new tags
    if (updates.tags && updates.tags.length > 0) {
      sections.push('\n🏷️  New Tags:');
      sections.push(updates.tags.join(', '));
    }

    // Show new links
    if (updates.links && updates.links.length > 0) {
      sections.push('\n🔗 New Links:');
      for (const link of updates.links) {
        sections.push(`  - ${link.comment}: ${link.url}`);
      }
    }

    if (sections.length === 0) {
      return '[no changes]';
    }

    return sections.join('\n');
  }
}
