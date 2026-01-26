/**
 * Utility functions for XML escaping and text truncation.
 *
 * These utilities ensure safe XML generation and preserve readability
 * when compressing text for LLM context windows.
 */

/**
 * Escape XML special characters for safe inclusion in XML content.
 *
 * Handles: & < > " '
 * Order matters: & must be first to avoid double-escaping.
 *
 * @param text - Text to escape (handles null/undefined)
 * @returns Escaped text safe for XML content
 *
 * @example
 * escapeXml('PR <title> & "description"')
 * // Returns: 'PR &lt;title&gt; &amp; &quot;description&quot;'
 */
export function escapeXml(text: string | null | undefined): string {
  if (text === null || text === undefined) {
    return '';
  }

  return text
    .replace(/&/g, '&amp;')  // MUST be first
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Truncate text at word boundary to preserve readability.
 *
 * Strategy:
 * 1. If text fits, return as-is
 * 2. Find last space within maxLength
 * 3. If space found, truncate at space + '...'
 * 4. If no space (single long word), truncate at maxLength + '...'
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum character length (excluding '...')
 * @returns Truncated text with '...' if needed
 *
 * @example
 * truncateText('This is a long title', 10)
 * // Returns: 'This is a...'
 *
 * @example
 * truncateText('Supercalifragilisticexpialidocious', 10)
 * // Returns: 'Supercalif...'
 */
export function truncateText(text: string, maxLength: number): string {
  // Handle empty or null input
  if (!text || text.length === 0) {
    return '';
  }

  // No truncation needed
  if (text.length <= maxLength) {
    return text;
  }

  // Find last space within maxLength
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  // If space found, truncate at word boundary
  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + '...';
  }

  // No space found (single long word), truncate at maxLength
  return truncated + '...';
}
