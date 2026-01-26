import { describe, it, expect, beforeEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { loadOverrides, saveOverride, applyOverrides, getMidnightExpiry } from './overrides.js';
import type { ScoredItem } from './types.js';

const OPS_DIR = path.join(process.env.HOME || '', '.ops');
const OVERRIDES_FILE = path.join(OPS_DIR, 'overrides.json');

describe('overrides', () => {
  beforeEach(async () => {
    // Clean up test file
    try { await fs.unlink(OVERRIDES_FILE); } catch {}
  });

  it('getMidnightExpiry returns future timestamp', () => {
    const expiry = getMidnightExpiry();
    expect(new Date(expiry) > new Date()).toBe(true);
  });

  it('loadOverrides returns empty array when file missing', async () => {
    const overrides = await loadOverrides();
    expect(overrides).toEqual([]);
  });

  it('saveOverride creates new override', async () => {
    const result = await saveOverride(123, 'work_item', 10);
    expect(result.isOk()).toBe(true);

    const overrides = await loadOverrides();
    expect(overrides).toHaveLength(1);
    expect(overrides[0].id).toBe(123);
    expect(overrides[0].amount).toBe(10);
  });

  it('saveOverride replaces existing override for same item', async () => {
    await saveOverride(123, 'work_item', 10);
    await saveOverride(123, 'work_item', 20);

    const overrides = await loadOverrides();
    expect(overrides).toHaveLength(1);
    expect(overrides[0].amount).toBe(20);
  });

  it('applyOverrides adjusts scores', () => {
    const items: ScoredItem[] = [{
      item: { type: 'work_item', item: { id: 123, title: 'Test', priority: 1 } },
      score: 5,
      appliedRules: [{ name: 'p1_priority', weight: 5 }]
    }];

    const overrides = [{ id: 123, type: 'work_item' as const, amount: 10, expires_at: getMidnightExpiry(), created_at: new Date().toISOString() }];

    const result = applyOverrides(items, overrides);
    expect(result[0].score).toBe(15);
    expect(result[0].appliedRules).toContainEqual({ name: 'manual_boost', weight: 10 });
  });
});
