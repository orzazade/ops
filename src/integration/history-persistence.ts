/**
 * History persistence for daily briefings.
 * Saves and loads briefings from ~/.ops/history/YYYY-MM-DD.json
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { GLOBAL_HISTORY_DIR } from '../state/paths.js';
import { BriefingSchema, type Briefing } from '../triage/schemas.js';

/**
 * Get the filename for a briefing on a given date.
 * Returns ISO 8601 format: YYYY-MM-DD.json
 *
 * @param date - The date (defaults to today)
 * @returns Filename in ISO 8601 format
 */
export function getDateFilename(date?: Date): string {
  const d = date || new Date();
  // Use UTC to ensure consistent behavior across timezones
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}.json`;
}

/**
 * Persist a briefing to disk.
 * Saves to ~/.ops/history/YYYY-MM-DD.json
 *
 * @param briefing - The briefing to save
 * @param date - The date (defaults to today)
 */
export async function persistBriefing(
  briefing: Briefing,
  date?: Date
): Promise<void> {
  // Ensure history directory exists
  await fs.mkdir(GLOBAL_HISTORY_DIR, { recursive: true });

  // Get filename and full path
  const filename = getDateFilename(date);
  const filepath = path.join(GLOBAL_HISTORY_DIR, filename);

  // Write with formatting
  const json = JSON.stringify(briefing, null, 2);
  await fs.writeFile(filepath, json, 'utf-8');
}

/**
 * Load a briefing from disk for a given date.
 * Returns undefined if file doesn't exist or is invalid.
 *
 * @param date - The date to load
 * @returns The briefing, or undefined if not found/invalid
 */
export async function loadBriefing(date: Date): Promise<Briefing | undefined> {
  try {
    const filename = getDateFilename(date);
    const filepath = path.join(GLOBAL_HISTORY_DIR, filename);

    const content = await fs.readFile(filepath, 'utf-8');
    const json = JSON.parse(content);

    // Validate with schema
    const result = BriefingSchema.safeParse(json);
    if (!result.success) {
      return undefined;
    }

    return result.data;
  } catch (error) {
    // Return undefined for any error (file not found, parse error, etc.)
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    return undefined;
  }
}

/**
 * Load yesterday's briefing.
 * Returns undefined if yesterday's briefing doesn't exist.
 *
 * @returns Yesterday's briefing, or undefined
 */
export async function loadYesterdayBriefing(): Promise<Briefing | undefined> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return loadBriefing(yesterday);
}
