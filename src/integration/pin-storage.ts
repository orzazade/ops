/**
 * Persistent pin storage for briefing items.
 *
 * Manages pins in ~/.ops/pins.json with graceful degradation
 * for missing or corrupt files.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Pin, PinsFile, BriefingItem } from '../triage/schemas.js';
import { PinsFileSchema } from '../triage/schemas.js';

/**
 * Path to the pins file in user's home directory.
 */
const PINS_PATH = join(homedir(), '.ops', 'pins.json');

/**
 * Loads pins from ~/.ops/pins.json.
 *
 * Gracefully degrades on missing or corrupt files:
 * - Missing file → returns empty array
 * - Corrupt JSON → returns empty array
 * - Invalid schema → returns empty array
 *
 * @returns Array of pinned items
 */
export async function loadPins(): Promise<Pin[]> {
  try {
    const content = await readFile(PINS_PATH, 'utf-8');
    const parsed = JSON.parse(content);
    const validated = PinsFileSchema.parse(parsed);
    return validated.pins;
  } catch (error) {
    // Graceful degradation: missing or corrupt file → empty array
    return [];
  }
}

/**
 * Saves pins to ~/.ops/pins.json.
 *
 * Creates directory if it doesn't exist.
 * Overwrites existing file with new pins.
 *
 * @param pins - Array of pins to save
 */
export async function savePins(pins: Pin[]): Promise<void> {
  const pinsFile: PinsFile = {
    version: 1,
    pins,
  };

  // Ensure directory exists
  await mkdir(join(homedir(), '.ops'), { recursive: true });

  // Write with pretty formatting for manual inspection
  await writeFile(PINS_PATH, JSON.stringify(pinsFile, null, 2), 'utf-8');
}

/**
 * Pins a briefing item.
 *
 * Adds the item to the pins file if not already pinned.
 * Updates existing pin if already present (refreshes timestamp).
 *
 * @param item - Briefing item to pin
 */
export async function pinItem(item: BriefingItem): Promise<void> {
  const pins = await loadPins();

  // Remove existing pin if present
  const filtered = pins.filter(
    (pin) => !(pin.id === item.id && pin.type === item.type)
  );

  // Add new pin with current timestamp
  const newPin: Pin = {
    id: item.id,
    type: item.type,
    title: item.title,
    pinned_at: new Date().toISOString(),
  };

  filtered.push(newPin);
  await savePins(filtered);
}

/**
 * Unpins a briefing item.
 *
 * Removes the item from the pins file if present.
 * No-op if item is not pinned.
 *
 * @param id - Item ID
 * @param type - Item type
 */
export async function unpinItem(
  id: number,
  type: 'work_item' | 'pull_request'
): Promise<void> {
  const pins = await loadPins();

  // Remove pin if present
  const filtered = pins.filter(
    (pin) => !(pin.id === id && pin.type === type)
  );

  await savePins(filtered);
}

/**
 * Applies pins to a briefing items array.
 *
 * Reorders items so pinned items appear first, maintaining
 * their original relative order within pinned and unpinned groups.
 *
 * @param items - Briefing items to reorder
 * @returns Reordered items with pinned items first
 */
export async function applyPins(items: BriefingItem[]): Promise<BriefingItem[]> {
  const pins = await loadPins();

  // Build set of pinned item keys for O(1) lookup
  const pinnedKeys = new Set(
    pins.map((pin) => `${pin.type}:${pin.id}`)
  );

  // Partition items into pinned and unpinned
  const pinned: BriefingItem[] = [];
  const unpinned: BriefingItem[] = [];

  for (const item of items) {
    const key = `${item.type}:${item.id}`;
    if (pinnedKeys.has(key)) {
      pinned.push(item);
    } else {
      unpinned.push(item);
    }
  }

  // Return pinned first, then unpinned
  return [...pinned, ...unpinned];
}
