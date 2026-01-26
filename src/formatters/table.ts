/**
 * Table formatters for work items, PRs, and priorities.
 *
 * Generates markdown tables (GFM format) for Claude Code rendering.
 * Uses markdown-table for proper alignment and emoji handling.
 */

import { markdownTable } from 'markdown-table';
import { truncateTitle } from './utils.js';
import { EMOJI, getPriorityEmoji, getDeltaEmoji, getStateEmoji } from './emoji.js';

/**
 * Work item row data for table formatting.
 */
export interface WorkItemRow {
  id: number;
  title: string;
  priority: number;
  state: string;
  age: number;
  assigned: string;
}

/**
 * PR row data for table formatting.
 */
export interface PRRow {
  id: number;
  title: string;
  author: string;
  status: string;
  lastUpdate: string;
}

/**
 * Priority row data with delta marker support.
 */
export interface PriorityRow {
  id: number;
  title: string;
  type: 'work_item' | 'pull_request';
  priority: number;
  delta: 'new' | 'up' | 'down' | 'unchanged';
  isPinned?: boolean;
}

/**
 * Format work items as a markdown table.
 *
 * Columns: ID, Title, Priority, State, Age, Assigned
 * - Title truncated to 60 chars
 * - Priority shows emoji + "P1"/"P2"/"P3"
 *
 * @param items - Work item rows to format
 * @returns Markdown table string
 */
export function formatWorkItemsTable(items: WorkItemRow[]): string {
  if (items.length === 0) {
    return '_No work items_';
  }

  const headers = ['ID', 'Title', 'Priority', 'State', 'Age', 'Assigned'];

  const rows = items.map((item) => [
    `#${item.id}`,
    truncateTitle(item.title, 60),
    `${getPriorityEmoji(item.priority)} P${item.priority}`,
    `${getStateEmoji(item.state)} ${item.state}`,
    `${item.age}d`,
    item.assigned,
  ]);

  return markdownTable([headers, ...rows], {
    align: ['l', 'l', 'c', 'l', 'r', 'l'],
  });
}

/**
 * Format pull requests as a markdown table.
 *
 * Columns: ID, Title, Author, Status, Last Update
 *
 * @param prs - PR rows to format
 * @returns Markdown table string
 */
export function formatPRsTable(prs: PRRow[]): string {
  if (prs.length === 0) {
    return '_No pull requests_';
  }

  const headers = ['ID', 'Title', 'Author', 'Status', 'Last Update'];

  const rows = prs.map((pr) => [
    `#${pr.id}`,
    truncateTitle(pr.title, 60),
    pr.author,
    pr.status,
    pr.lastUpdate,
  ]);

  return markdownTable([headers, ...rows], {
    align: ['l', 'l', 'l', 'l', 'r'],
  });
}

/**
 * Format priorities table with delta markers.
 *
 * First column shows delta (NEW/UP/DOWN/unchanged) + pinned marker.
 * Columns: Delta, ID, Title, Priority
 *
 * @param items - Priority rows to format
 * @returns Markdown table string
 */
export function formatPrioritiesTable(items: PriorityRow[]): string {
  if (items.length === 0) {
    return '_No priorities_';
  }

  const headers = ['\u0394', 'ID', 'Title', 'Type', 'Priority'];

  const rows = items.map((item) => {
    // Build delta marker with optional pin
    let deltaMarker = getDeltaEmoji(item.delta);
    if (item.isPinned) {
      deltaMarker = `${EMOJI.PINNED}${deltaMarker}`;
    }

    // Type indicator
    const typeEmoji =
      item.type === 'work_item' ? EMOJI.WORK_ITEM : EMOJI.PULL_REQUEST;
    const typeLabel = item.type === 'work_item' ? 'WI' : 'PR';

    return [
      deltaMarker,
      `#${item.id}`,
      truncateTitle(item.title, 50),
      `${typeEmoji} ${typeLabel}`,
      `${getPriorityEmoji(item.priority)} P${item.priority}`,
    ];
  });

  return markdownTable([headers, ...rows], {
    align: ['c', 'l', 'l', 'c', 'c'],
  });
}
