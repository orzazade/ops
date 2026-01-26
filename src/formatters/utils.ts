/**
 * Utility functions for output formatting.
 *
 * Handles width calculation and title truncation with proper
 * emoji and full-width character support.
 */

import stringWidth from 'string-width';

/**
 * Calculate the visual width of a string in terminal cells.
 *
 * Handles emoji (2 cells), full-width characters (2 cells),
 * combining characters (0 cells), and regular ASCII (1 cell).
 *
 * @param text - String to measure
 * @returns Visual width in terminal cells
 */
export function calculateVisualWidth(text: string): number {
  return stringWidth(text);
}

/**
 * Truncate a title to fit within a maximum visual width.
 *
 * Properly handles emoji and full-width characters by measuring
 * visual width rather than character count. Adds "..." ellipsis
 * when truncation occurs.
 *
 * @param title - Title string to truncate
 * @param maxWidth - Maximum visual width (default: 60)
 * @returns Truncated title with ellipsis if needed
 */
export function truncateTitle(title: string, maxWidth: number = 60): string {
  // Check if truncation is needed
  if (stringWidth(title) <= maxWidth) {
    return title;
  }

  // Build truncated string character by character
  let result = '';
  let width = 0;

  for (const char of title) {
    const charWidth = stringWidth(char);
    // Reserve 3 chars for "..." ellipsis
    if (width + charWidth + 3 > maxWidth) {
      break;
    }
    result += char;
    width += charWidth;
  }

  return result + '...';
}
