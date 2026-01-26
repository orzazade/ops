/**
 * Progress bar renderer for capacity visualization.
 * Uses cli-progress for real-time updates, simple ANSI for static display.
 */

/**
 * Render a static capacity bar with color coding.
 * Green < 80%, Yellow 80-100%, Red > 100%
 *
 * @param used - Story points used
 * @param capacity - Maximum capacity
 * @param width - Bar width in characters (default 30)
 */
export function renderCapacityBar(used: number, capacity: number, width: number = 30): string {
  const percentage = (used / capacity) * 100;
  const filled = Math.min(width, Math.round((used / capacity) * width));

  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(Math.max(0, width - filled));

  // Color coding: green < 80%, yellow 80-100%, red > 100%
  let colorCode = '\x1b[32m'; // green
  if (percentage > 120) colorCode = '\x1b[31m';      // red (over-committed)
  else if (percentage > 100) colorCode = '\x1b[91m'; // bright red
  else if (percentage >= 80) colorCode = '\x1b[33m'; // yellow

  const reset = '\x1b[0m';

  return `${colorCode}${bar}${reset} ${used}/${capacity} points (${percentage.toFixed(0)}%)`;
}
