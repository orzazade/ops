/**
 * Override persistence and application for boost/demote feature.
 *
 * Overrides are temporary score adjustments that expire at midnight.
 * Stored at ~/.ops/overrides.json with atomic writes for crash safety.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import writeFileAtomic from 'write-file-atomic';
import { Result, ok, err } from 'neverthrow';
import { OverridesFileSchema } from './schemas.js';
import type { Override, OverridesFile } from './schemas.js';
import type { ScoredItem, ScoreableItemType, AppliedRule } from './types.js';

// Re-export Override type for external consumers
export type { Override } from './schemas.js';

const OPS_DIR = path.join(process.env.HOME || '', '.ops');
const OVERRIDES_FILE = path.join(OPS_DIR, 'overrides.json');

/**
 * Get expiry timestamp for midnight tonight (UTC).
 */
export function getMidnightExpiry(): string {
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);
  return tomorrow.toISOString();
}

/**
 * Check if an override is expired.
 */
function isExpired(override: Override): boolean {
  return new Date(override.expires_at) <= new Date();
}

/**
 * Load overrides from file, filtering out expired entries.
 * Returns empty array if file doesn't exist or is invalid.
 */
export async function loadOverrides(): Promise<Override[]> {
  try {
    const content = await fs.readFile(OVERRIDES_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    const validated = OverridesFileSchema.parse(parsed);

    // Filter out expired overrides
    const active = validated.overrides.filter(o => !isExpired(o));

    // If we filtered any, persist the cleaned version
    if (active.length !== validated.overrides.length) {
      await saveOverridesFile({ version: 1, overrides: active });
    }

    return active;
  } catch {
    // File doesn't exist or is invalid - return empty
    return [];
  }
}

/**
 * Save overrides file atomically.
 */
async function saveOverridesFile(data: OverridesFile): Promise<Result<void, Error>> {
  try {
    // Ensure directory exists
    await fs.mkdir(OPS_DIR, { recursive: true });

    await writeFileAtomic(
      OVERRIDES_FILE,
      JSON.stringify(data, null, 2),
      { encoding: 'utf-8' }
    );
    return ok(undefined);
  } catch (error) {
    return err(error as Error);
  }
}

/**
 * Save a new override (boost or demote).
 * Replaces any existing override for the same item (no stacking).
 *
 * @param id - Item ID
 * @param type - work_item or pull_request
 * @param amount - Positive for boost, negative for demote
 */
export async function saveOverride(
  id: number,
  type: ScoreableItemType,
  amount: number
): Promise<Result<Override, Error>> {
  const overrides = await loadOverrides();

  // Remove any existing override for this item
  const filtered = overrides.filter(
    o => !(o.id === id && o.type === type)
  );

  // Create new override
  const newOverride: Override = {
    id,
    type,
    amount,
    expires_at: getMidnightExpiry(),
    created_at: new Date().toISOString(),
  };

  // Save with new override
  const result = await saveOverridesFile({
    version: 1,
    overrides: [...filtered, newOverride],
  });

  if (result.isErr()) {
    return err(result.error);
  }

  return ok(newOverride);
}

/**
 * Remove override for an item.
 */
export async function removeOverride(
  id: number,
  type: ScoreableItemType
): Promise<Result<void, Error>> {
  const overrides = await loadOverrides();
  const filtered = overrides.filter(
    o => !(o.id === id && o.type === type)
  );

  return saveOverridesFile({
    version: 1,
    overrides: filtered,
  });
}

/**
 * Get override for a specific item if one exists.
 */
export async function getOverride(
  id: number,
  type: ScoreableItemType
): Promise<Override | undefined> {
  const overrides = await loadOverrides();
  return overrides.find(o => o.id === id && o.type === type);
}

/**
 * Apply overrides to scored items.
 * Modifies scores based on active boosts/demotes.
 *
 * @param scoredItems - Items with base scores
 * @param overrides - Active overrides to apply
 * @returns Items with adjusted scores and applied rules
 */
export function applyOverrides(
  scoredItems: ScoredItem[],
  overrides: Override[]
): ScoredItem[] {
  if (overrides.length === 0) {
    return scoredItems;
  }

  // Build map for O(1) lookup
  const overrideMap = new Map<string, Override>();
  for (const o of overrides) {
    overrideMap.set(`${o.type}:${o.id}`, o);
  }

  return scoredItems.map(scored => {
    const key = `${scored.item.type}:${scored.item.item.id}`;
    const override = overrideMap.get(key);

    if (!override) {
      return scored;
    }

    // Determine rule name based on amount sign
    const ruleName = override.amount > 0 ? 'manual_boost' : 'manual_demote';
    const newRule: AppliedRule = {
      name: ruleName,
      weight: override.amount,
    };

    return {
      ...scored,
      score: Math.max(0, scored.score + override.amount),
      appliedRules: [...scored.appliedRules, newRule],
    };
  });
}
