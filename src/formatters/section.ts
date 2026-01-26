/**
 * Section header and separator formatters.
 *
 * Creates visual hierarchy in terminal output with box-style headers
 * and dashed line separators.
 */

import boxen from 'boxen';

/**
 * Format a major section header with box styling.
 *
 * Creates a centered, bold-bordered box for major sections
 * like "MORNING BRIEFING", "PRIORITIES", etc.
 *
 * @param title - Section title (will be uppercased)
 * @param width - Box width in characters (default: 60)
 * @returns Boxed header string
 */
export function formatSectionHeader(title: string, width: number = 60): string {
  return boxen(title.toUpperCase(), {
    padding: { top: 0, bottom: 0, left: 2, right: 2 },
    borderStyle: 'bold',
    textAlignment: 'center',
    width,
  });
}

/**
 * Format a subsection separator with title.
 *
 * Creates a dashed line separator for sub-sections within a major section.
 *
 * @param title - Subsection title
 * @returns Formatted separator string
 */
export function formatSubsectionSeparator(title: string): string {
  return `\n${title}\n${'- '.repeat(30).trim()}`;
}

/**
 * Format a footer with tier and timestamp metadata.
 *
 * Creates a subtle footer showing data quality tier and generation time.
 *
 * @param tier - Degradation tier (1-5)
 * @param timestamp - Generation timestamp
 * @returns Formatted footer string
 */
export function formatFooter(tier: number, timestamp: Date): string {
  const timeStr = timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `\n_Tier ${tier} | ${timeStr}_`;
}
