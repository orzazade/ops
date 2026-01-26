/**
 * History persistence for EOD (End-of-Day) summaries.
 * Saves and loads EOD summaries from ~/.ops/history/eod/YYYY-MM-DD.json
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EOD_HISTORY_DIR } from '../state/paths.js';
import { EODSummarySchema, type EODSummary } from './eod-types.js';
import { getDateFilename } from './history-persistence.js';

/**
 * Persist an EOD summary to disk.
 * Saves to ~/.ops/history/eod/YYYY-MM-DD.json
 *
 * @param summary - The EOD summary to save
 * @param date - The date (defaults to today)
 */
export async function persistEOD(
  summary: EODSummary,
  date?: Date
): Promise<void> {
  // Ensure EOD history directory exists
  await fs.mkdir(EOD_HISTORY_DIR, { recursive: true });

  // Get filename and full path
  const filename = getDateFilename(date);
  const filepath = path.join(EOD_HISTORY_DIR, filename);

  // Write with formatting
  const json = JSON.stringify(summary, null, 2);
  await fs.writeFile(filepath, json, 'utf-8');
}

/**
 * Load an EOD summary from disk for a given date.
 * Returns undefined if file doesn't exist or is invalid.
 *
 * @param date - The date to load
 * @returns The EOD summary, or undefined if not found/invalid
 */
export async function loadEOD(date: Date): Promise<EODSummary | undefined> {
  try {
    const filename = getDateFilename(date);
    const filepath = path.join(EOD_HISTORY_DIR, filename);

    const content = await fs.readFile(filepath, 'utf-8');
    const json = JSON.parse(content);

    // Validate with schema
    const result = EODSummarySchema.safeParse(json);
    if (!result.success) {
      return undefined;
    }

    return result.data;
  } catch (error) {
    // Return undefined for any error (file not found, parse error, etc.)
    return undefined;
  }
}

/**
 * Load yesterday's EOD summary.
 * Returns undefined if yesterday's EOD doesn't exist.
 *
 * @returns Yesterday's EOD summary, or undefined
 */
export async function loadYesterdayEOD(): Promise<EODSummary | undefined> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return loadEOD(yesterday);
}
