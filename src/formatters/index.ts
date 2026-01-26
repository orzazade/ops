/**
 * Output formatters for beautiful terminal output.
 *
 * Provides consistent visual output infrastructure across all skills:
 * - Emoji vocabulary with type-safe constants
 * - Width-aware utilities for truncation and measurement
 * - Markdown table formatters for work items and PRs
 * - Section headers and separators for visual hierarchy
 */

export * from './emoji.js';
export * from './utils.js';
export * from './table.js';
export * from './section.js';
export * from './score-explainer.js';
