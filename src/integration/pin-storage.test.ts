/**
 * Tests for pin storage.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  loadPins,
  savePins,
  pinItem,
  unpinItem,
  applyPins,
} from './pin-storage.js';
import type { BriefingItem, Pin, PinsFile } from '../triage/schemas.js';

const PINS_PATH = join(homedir(), '.ops', 'pins.json');

describe('pin storage', () => {
  const workItem1: BriefingItem = {
    id: 12345,
    type: 'work_item',
    title: 'Fix login bug',
    priority_reason: 'Blocking production',
    needs_response: false,
  };

  const pullRequest1: BriefingItem = {
    id: 789,
    type: 'pull_request',
    title: 'Add auth tests',
    priority_reason: 'VIP review',
    needs_response: true,
    suggested_response: 'Thanks!',
  };

  beforeEach(async () => {
    // Clean up pins file before each test for isolation
    try {
      await rm(PINS_PATH, { force: true });
    } catch {
      // Ignore if file doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up pins file after each test
    try {
      await rm(PINS_PATH, { force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('loadPins', () => {
    it('should return empty array when file does not exist', async () => {
      const pins = await loadPins();
      expect(pins).toEqual([]);
    });

    it('should load valid pins file', async () => {
      const pinsFile: PinsFile = {
        version: 1,
        pins: [
          {
            id: 12345,
            type: 'work_item',
            title: 'Test item',
            pinned_at: '2026-01-26T12:00:00Z',
          },
        ],
      };

      await mkdir(join(homedir(), '.ops'), { recursive: true });
      await writeFile(
        join(homedir(), '.ops', 'pins.json'),
        JSON.stringify(pinsFile),
        'utf-8'
      );

      const pins = await loadPins();
      expect(pins).toHaveLength(1);
      expect(pins[0].id).toBe(12345);
      expect(pins[0].type).toBe('work_item');
      expect(pins[0].title).toBe('Test item');
    });

    it('should return empty array for corrupt JSON', async () => {
      await mkdir(join(homedir(), '.ops'), { recursive: true });
      await writeFile(
        join(homedir(), '.ops', 'pins.json'),
        'invalid json{',
        'utf-8'
      );

      const pins = await loadPins();
      expect(pins).toEqual([]);
    });

    it('should return empty array for invalid schema', async () => {
      await mkdir(join(homedir(), '.ops'), { recursive: true });
      await writeFile(
        join(homedir(), '.ops', 'pins.json'),
        JSON.stringify({ invalid: 'schema' }),
        'utf-8'
      );

      const pins = await loadPins();
      expect(pins).toEqual([]);
    });
  });

  describe('savePins', () => {
    it('should create directory if it does not exist', async () => {
      const pins: Pin[] = [
        {
          id: 12345,
          type: 'work_item',
          title: 'Test item',
          pinned_at: '2026-01-26T12:00:00Z',
        },
      ];

      await savePins(pins);

      const content = await readFile(
        join(homedir(), '.ops', 'pins.json'),
        'utf-8'
      );
      const parsed = JSON.parse(content);
      expect(parsed.version).toBe(1);
      expect(parsed.pins).toHaveLength(1);
      expect(parsed.pins[0].id).toBe(12345);
    });

    it('should overwrite existing file', async () => {
      await mkdir(join(homedir(), '.ops'), { recursive: true });
      await writeFile(
        join(homedir(), '.ops', 'pins.json'),
        JSON.stringify({ version: 1, pins: [] }),
        'utf-8'
      );

      const pins: Pin[] = [
        {
          id: 99999,
          type: 'pull_request',
          title: 'New pin',
          pinned_at: '2026-01-26T12:00:00Z',
        },
      ];

      await savePins(pins);

      const content = await readFile(
        join(homedir(), '.ops', 'pins.json'),
        'utf-8'
      );
      const parsed = JSON.parse(content);
      expect(parsed.pins).toHaveLength(1);
      expect(parsed.pins[0].id).toBe(99999);
    });

    it('should format JSON with indentation', async () => {
      const pins: Pin[] = [
        {
          id: 12345,
          type: 'work_item',
          title: 'Test item',
          pinned_at: '2026-01-26T12:00:00Z',
        },
      ];

      await savePins(pins);

      const content = await readFile(
        join(homedir(), '.ops', 'pins.json'),
        'utf-8'
      );
      // Should contain newlines and indentation
      expect(content).toContain('\n');
      expect(content).toContain('  ');
    });
  });

  describe('pinItem', () => {
    it('should add new pin', async () => {
      await pinItem(workItem1);

      const pins = await loadPins();
      expect(pins).toHaveLength(1);
      expect(pins[0].id).toBe(12345);
      expect(pins[0].type).toBe('work_item');
      expect(pins[0].title).toBe('Fix login bug');
      expect(pins[0].pinned_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should update existing pin', async () => {
      await pinItem(workItem1);
      const firstPins = await loadPins();
      const firstTimestamp = firstPins[0].pinned_at;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      await pinItem(workItem1);
      const secondPins = await loadPins();

      expect(secondPins).toHaveLength(1);
      expect(secondPins[0].pinned_at).not.toBe(firstTimestamp);
    });

    it('should handle multiple pins', async () => {
      await pinItem(workItem1);
      await pinItem(pullRequest1);

      const pins = await loadPins();
      expect(pins).toHaveLength(2);
      expect(pins.map((p) => p.id)).toContain(12345);
      expect(pins.map((p) => p.id)).toContain(789);
    });
  });

  describe('unpinItem', () => {
    it('should remove existing pin', async () => {
      await pinItem(workItem1);
      await pinItem(pullRequest1);

      await unpinItem(12345, 'work_item');

      const pins = await loadPins();
      expect(pins).toHaveLength(1);
      expect(pins[0].id).toBe(789);
      expect(pins[0].type).toBe('pull_request');
    });

    it('should be no-op if item not pinned', async () => {
      await pinItem(workItem1);

      await unpinItem(99999, 'work_item');

      const pins = await loadPins();
      expect(pins).toHaveLength(1);
      expect(pins[0].id).toBe(12345);
    });

    it('should distinguish work items and PRs with same ID', async () => {
      const workItem: BriefingItem = {
        id: 100,
        type: 'work_item',
        title: 'Work Item 100',
        priority_reason: 'Reason A',
        needs_response: false,
      };

      const pullRequest: BriefingItem = {
        id: 100,
        type: 'pull_request',
        title: 'Pull Request 100',
        priority_reason: 'Reason B',
        needs_response: false,
      };

      await pinItem(workItem);
      await pinItem(pullRequest);

      await unpinItem(100, 'work_item');

      const pins = await loadPins();
      expect(pins).toHaveLength(1);
      expect(pins[0].type).toBe('pull_request');
    });
  });

  describe('applyPins', () => {
    it('should return items with pinned first', async () => {
      const workItem2: BriefingItem = {
        id: 12346,
        type: 'work_item',
        title: 'Update docs',
        priority_reason: 'Sprint deadline',
        needs_response: false,
      };

      await pinItem(pullRequest1);

      const items = [workItem1, pullRequest1, workItem2];
      const reordered = await applyPins(items);

      expect(reordered).toHaveLength(3);
      expect(reordered[0].id).toBe(789); // Pinned PR first
      expect(reordered[1].id).toBe(12345); // Unpinned work item
      expect(reordered[2].id).toBe(12346); // Unpinned work item
    });

    it('should maintain relative order within pinned group', async () => {
      const workItem2: BriefingItem = {
        id: 12346,
        type: 'work_item',
        title: 'Update docs',
        priority_reason: 'Sprint deadline',
        needs_response: false,
      };

      await pinItem(workItem1);
      await pinItem(workItem2);

      const items = [workItem1, pullRequest1, workItem2];
      const reordered = await applyPins(items);

      expect(reordered[0].id).toBe(12345); // First pinned in original order
      expect(reordered[1].id).toBe(12346); // Second pinned in original order
      expect(reordered[2].id).toBe(789); // Unpinned
    });

    it('should return all items if none pinned', async () => {
      const items = [workItem1, pullRequest1];
      const reordered = await applyPins(items);

      expect(reordered).toEqual(items);
    });

    it('should return all items if all pinned', async () => {
      await pinItem(workItem1);
      await pinItem(pullRequest1);

      const items = [workItem1, pullRequest1];
      const reordered = await applyPins(items);

      expect(reordered).toEqual(items);
    });

    it('should handle empty items array', async () => {
      await pinItem(workItem1);

      const reordered = await applyPins([]);

      expect(reordered).toEqual([]);
    });
  });
});
