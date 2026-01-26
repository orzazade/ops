/**
 * Emoji vocabulary and helper functions for output formatting.
 *
 * Provides consistent, type-safe emoji constants across all skills.
 * Uses literal strings (no chalk/node-emoji dependencies).
 */

/**
 * Centralized emoji vocabulary.
 * Traffic light colors for priority (universally understood).
 */
export const EMOJI = {
  // Priority indicators (traffic light)
  PRIORITY_P1: '\u{1F534}', // Red circle
  PRIORITY_P2: '\u{1F7E0}', // Orange circle
  PRIORITY_P3: '\u{1F7E1}', // Yellow circle

  // Item types
  WORK_ITEM: '\u{1F4CC}', // Pushpin
  PULL_REQUEST: '\u{1F4E5}', // Inbox tray

  // Status/state
  DONE: '\u{2705}', // Check mark
  IN_PROGRESS: '\u{1F6A7}', // Construction
  BLOCKED: '\u{26D4}', // No entry

  // Delta markers
  DELTA_NEW: '\u{1F7E2}', // Green circle
  DELTA_UP: '\u{1F53A}', // Up triangle
  DELTA_DOWN: '\u{1F53B}', // Down triangle
  DELTA_UNCHANGED: '\u{2796}', // Minus sign

  // Special
  PINNED: '\u{1F4CC}', // Pushpin (same as work item)
} as const;

export type EmojiKey = keyof typeof EMOJI;

/**
 * Get priority emoji based on numeric priority level.
 *
 * @param priority - Priority level (1, 2, or 3+)
 * @returns Emoji string for the priority
 */
export function getPriorityEmoji(priority: number): string {
  if (priority === 1) return EMOJI.PRIORITY_P1;
  if (priority === 2) return EMOJI.PRIORITY_P2;
  return EMOJI.PRIORITY_P3;
}

/**
 * Get delta emoji based on change type.
 *
 * @param delta - Type of change
 * @returns Emoji string for the delta
 */
export function getDeltaEmoji(
  delta: 'new' | 'up' | 'down' | 'unchanged'
): string {
  switch (delta) {
    case 'new':
      return EMOJI.DELTA_NEW;
    case 'up':
      return EMOJI.DELTA_UP;
    case 'down':
      return EMOJI.DELTA_DOWN;
    case 'unchanged':
      return EMOJI.DELTA_UNCHANGED;
  }
}

/**
 * Get state emoji based on ADO work item state.
 *
 * Maps common ADO states to appropriate emoji.
 *
 * @param state - ADO work item state string
 * @returns Emoji string for the state
 */
export function getStateEmoji(state: string): string {
  const normalizedState = state.toLowerCase();

  if (
    normalizedState === 'done' ||
    normalizedState === 'closed' ||
    normalizedState === 'resolved'
  ) {
    return EMOJI.DONE;
  }

  if (
    normalizedState === 'active' ||
    normalizedState === 'in progress' ||
    normalizedState === 'committed'
  ) {
    return EMOJI.IN_PROGRESS;
  }

  if (normalizedState === 'blocked' || normalizedState === 'on hold') {
    return EMOJI.BLOCKED;
  }

  // Default: no emoji for unknown states
  return '';
}
