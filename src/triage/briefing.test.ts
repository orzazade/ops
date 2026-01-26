/**
 * Tests for BriefingGenerator.
 *
 * Uses mocked Anthropic client to test briefing generation
 * without making real API calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { BriefingGenerator } from './briefing.js';
import type { OpsConfig } from '../config/schema.js';
import type { ScoredItem } from './types.js';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn(),
  };
});

describe('BriefingGenerator', () => {
  let mockClient: Partial<Anthropic>;
  let mockCreate: ReturnType<typeof vi.fn>;
  let config: OpsConfig;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock client
    mockCreate = vi.fn();
    mockClient = {
      beta: {
        messages: {
          create: mockCreate,
        },
      } as unknown as Anthropic['beta']['messages'],
    } as Partial<Anthropic>;

    // Default config
    config = {
      azure: {
        organization: 'test-org',
        default_project: 'test-project',
      },
      vips: [],
      priorities: {
        sprint_commitment: 3,
        vip_involvement: 3,
        blocking_others: 2,
        age_over_3_days: 2,
        p1_priority: 2,
        p2_priority: 1,
        carried_over: 1,
      },
      gsd: {
        scan_paths: ['.'],
        exclude: ['node_modules', '.git'],
      },
      preferences: {
        briefing_length: 'concise',
        response_style: 'professional',
        timezone: 'UTC',
      },
    };
  });

  describe('constructor', () => {
    it('should accept injected client', () => {
      const generator = new BriefingGenerator(
        config,
        mockClient as Anthropic
      );
      expect(generator).toBeDefined();
    });

    it('should throw if no client and no API key', () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      expect(() => new BriefingGenerator(config)).toThrow(
        /ANTHROPIC_API_KEY/
      );

      // Restore
      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      }
    });
  });

  describe('generate', () => {
    it('should generate briefing from scored items', async () => {
      const scoredItems: ScoredItem[] = [
        {
          item: {
            type: 'work_item',
            item: {
              id: 123,
              title: 'Fix critical bug',
              type: 'Bug',
              state: 'Active',
              priority: 1,
              assignedTo: 'John Doe',
              description: 'Critical production issue',
            },
          },
          score: 5,
          appliedRules: [
            { name: 'p1_priority', weight: 2 },
            { name: 'vip_involvement', weight: 3 },
          ],
        },
        {
          item: {
            type: 'pull_request',
            item: {
              id: 456,
              title: 'Add feature X',
              repository: 'main-repo',
              author: 'Jane Smith',
              status: 'active',
              description: 'New feature implementation',
              reviewers: [],
            },
          },
          score: 3,
          appliedRules: [{ name: 'vip_involvement', weight: 3 }],
        },
      ];

      // Mock response
      const mockBriefing = {
        summary: 'Two high-priority items need attention today.',
        top_priorities: [
          {
            id: 123,
            type: 'work_item',
            title: 'Fix critical bug',
            priority_reason: 'P1 bug affecting production',
            needs_response: false,
          },
        ],
        needs_response: [],
        blockers: [],
        timestamp: new Date().toISOString(),
      };

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockBriefing),
          },
        ],
      });

      const generator = new BriefingGenerator(
        config,
        mockClient as Anthropic
      );
      const result = await generator.generate(scoredItems);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.summary).toBe(mockBriefing.summary);
        expect(result.value.top_priorities).toHaveLength(1);
        expect(result.value.top_priorities[0].id).toBe(123);
      }

      // Verify API call
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-5-20250929',
          betas: ['structured-outputs-2025-11-13'],
          response_format: expect.objectContaining({
            type: 'json_schema',
          }),
        })
      );
    });

    it('should include context in prompt when provided', async () => {
      const scoredItems: ScoredItem[] = [];
      const context = 'Sprint 42 - Focus on performance improvements';

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'Test',
              top_priorities: [],
              needs_response: [],
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      });

      const generator = new BriefingGenerator(
        config,
        mockClient as Anthropic
      );
      await generator.generate(scoredItems, context);

      // Verify context is in the user message
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain(context);
    });

    it('should respect professional response style in system prompt', async () => {
      config.preferences.response_style = 'professional';

      const scoredItems: ScoredItem[] = [];

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'Test',
              top_priorities: [],
              needs_response: [],
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      });

      const generator = new BriefingGenerator(
        config,
        mockClient as Anthropic
      );
      await generator.generate(scoredItems);

      // Verify professional style in system prompt
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.system).toContain('professional');
    });

    it('should respect casual response style in system prompt', async () => {
      config.preferences.response_style = 'casual';

      const scoredItems: ScoredItem[] = [];

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'Test',
              top_priorities: [],
              needs_response: [],
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      });

      const generator = new BriefingGenerator(
        config,
        mockClient as Anthropic
      );
      await generator.generate(scoredItems);

      // Verify casual style in system prompt
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.system).toContain('friendly');
    });

    it('should handle API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('API rate limit exceeded'));

      const generator = new BriefingGenerator(
        config,
        mockClient as Anthropic
      );
      const result = await generator.generate([]);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('API rate limit exceeded');
      }
    });

    it('should handle invalid response format', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Not valid JSON',
          },
        ],
      });

      const generator = new BriefingGenerator(
        config,
        mockClient as Anthropic
      );
      const result = await generator.generate([]);

      expect(result.isErr()).toBe(true);
    });

    it('should handle schema validation errors', async () => {
      // Invalid briefing - missing required fields
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'Test',
              // Missing required fields
            }),
          },
        ],
      });

      const generator = new BriefingGenerator(
        config,
        mockClient as Anthropic
      );
      const result = await generator.generate([]);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('validation failed');
      }
    });

    it('should handle non-text response content', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'image',
            // Wrong content type
          },
        ],
      });

      const generator = new BriefingGenerator(
        config,
        mockClient as Anthropic
      );
      const result = await generator.generate([]);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Expected text response');
      }
    });
  });
});
