/**
 * Tests for history persistence module.
 * RED phase: These tests should fail initially.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { GLOBAL_HISTORY_DIR } from '../state/paths.js';
import type { Briefing } from '../triage/schemas.js';

// Mock fs/promises module
vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
  readFile: vi.fn(),
  mkdir: vi.fn(),
}));

// Import after mocking
import {
  getDateFilename,
  persistBriefing,
  loadBriefing,
  loadYesterdayBriefing,
} from './history-persistence.js';

describe('getDateFilename', () => {
  it('should return today\'s filename when no date provided', () => {
    const filename = getDateFilename();
    // Should match YYYY-MM-DD.json format
    expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('should return ISO 8601 formatted filename for given date', () => {
    const date = new Date('2026-01-25T10:30:00Z');
    const filename = getDateFilename(date);
    expect(filename).toBe('2026-01-25.json');
  });

  it('should handle dates with different timezones consistently', () => {
    const date = new Date('2026-01-25T23:59:59Z');
    const filename = getDateFilename(date);
    expect(filename).toBe('2026-01-25.json');
  });
});

describe('persistBriefing', () => {
  const mockBriefing: Briefing = {
    summary: 'Test briefing',
    top_priorities: [
      {
        id: 12345,
        type: 'work_item',
        title: 'Test item',
        priority_reason: 'High priority',
        needs_response: false,
      },
    ],
    needs_response: [],
    timestamp: '2026-01-26T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create history directory if missing', async () => {
    await persistBriefing(mockBriefing);

    expect(fs.mkdir).toHaveBeenCalledWith(GLOBAL_HISTORY_DIR, {
      recursive: true,
    });
  });

  it('should save briefing to correct path with today\'s date', async () => {
    await persistBriefing(mockBriefing);

    const calls = vi.mocked(fs.writeFile).mock.calls;
    expect(calls.length).toBe(1);

    const [filepath, content] = calls[0];
    expect(filepath).toMatch(
      new RegExp(`${GLOBAL_HISTORY_DIR.replace(/[/\\]/g, '[/\\\\]')}.+\\.json$`)
    );
    expect(filepath).toMatch(/\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('should save briefing with custom date', async () => {
    const date = new Date('2026-01-25T10:00:00Z');
    await persistBriefing(mockBriefing, date);

    const calls = vi.mocked(fs.writeFile).mock.calls;
    const [filepath] = calls[0];
    expect(filepath).toBe(path.join(GLOBAL_HISTORY_DIR, '2026-01-25.json'));
  });

  it('should format JSON with 2-space indentation', async () => {
    await persistBriefing(mockBriefing);

    const calls = vi.mocked(fs.writeFile).mock.calls;
    const [, content] = calls[0];

    expect(content).toContain('{\n  "summary"');
    expect(content).toContain('\n  "top_priorities"');
  });
});

describe('loadBriefing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return undefined if file does not exist (ENOENT)', async () => {
    const error: NodeJS.ErrnoException = new Error('File not found');
    error.code = 'ENOENT';
    vi.mocked(fs.readFile).mockRejectedValue(error);

    const date = new Date('2026-01-25');
    const result = await loadBriefing(date);

    expect(result).toBeUndefined();
  });

  it('should return parsed briefing if file exists and valid', async () => {
    const mockBriefing: Briefing = {
      summary: 'Test briefing',
      top_priorities: [
        {
          id: 12345,
          type: 'work_item',
          title: 'Test item',
          priority_reason: 'High priority',
          needs_response: false,
        },
      ],
      needs_response: [],
      timestamp: '2026-01-25T10:00:00Z',
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockBriefing));

    const date = new Date('2026-01-25');
    const result = await loadBriefing(date);

    expect(result).toEqual(mockBriefing);
  });

  it('should return undefined if file contains invalid JSON', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('{ invalid json }');

    const date = new Date('2026-01-25');
    const result = await loadBriefing(date);

    expect(result).toBeUndefined();
  });

  it('should return undefined if file fails schema validation', async () => {
    const invalidData = {
      summary: 'Test',
      // Missing required fields
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(invalidData));

    const date = new Date('2026-01-25');
    const result = await loadBriefing(date);

    expect(result).toBeUndefined();
  });

  it('should read from correct file path', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('{}');

    const date = new Date('2026-01-25');
    await loadBriefing(date);

    expect(fs.readFile).toHaveBeenCalledWith(
      path.join(GLOBAL_HISTORY_DIR, '2026-01-25.json'),
      'utf-8'
    );
  });
});

describe('loadYesterdayBriefing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load briefing from yesterday\'s date', async () => {
    const mockBriefing: Briefing = {
      summary: 'Yesterday briefing',
      top_priorities: [],
      needs_response: [],
      timestamp: '2026-01-25T10:00:00Z',
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockBriefing));

    const result = await loadYesterdayBriefing();

    // Should have called readFile with yesterday's date
    const calls = vi.mocked(fs.readFile).mock.calls;
    expect(calls.length).toBe(1);

    const [filepath] = calls[0];
    expect(filepath).toMatch(/\d{4}-\d{2}-\d{2}\.json$/);

    // Should return the briefing
    expect(result).toEqual(mockBriefing);
  });

  it('should return undefined if yesterday\'s briefing does not exist', async () => {
    const error: NodeJS.ErrnoException = new Error('File not found');
    error.code = 'ENOENT';
    vi.mocked(fs.readFile).mockRejectedValue(error);

    const result = await loadYesterdayBriefing();

    expect(result).toBeUndefined();
  });
});
