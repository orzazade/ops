/**
 * Briefing generator for triage system.
 *
 * Uses Claude with structured outputs to generate daily briefings
 * from scored work items and pull requests.
 */

import Anthropic from '@anthropic-ai/sdk';
import { Result, ok, err } from 'neverthrow';
import type { OpsConfig } from '../config/schema.js';
import type { ScoredItem } from './types.js';
import { BriefingSchema, type Briefing } from './schemas.js';

/**
 * Generates structured daily briefings using Claude AI.
 *
 * Takes scored items from PriorityScorer and produces a briefing
 * with top priorities, items needing response, and blockers.
 */
export class BriefingGenerator {
  private config: OpsConfig;
  private client: Anthropic;

  /**
   * Create a briefing generator.
   *
   * @param config - Ops configuration with briefing preferences
   * @param client - Optional Anthropic client (for testing injection)
   */
  constructor(config: OpsConfig, client?: Anthropic) {
    this.config = config;

    if (client) {
      this.client = client;
    } else {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error(
          'ANTHROPIC_API_KEY environment variable not set. ' +
            'Set it to use the briefing generator.'
        );
      }
      this.client = new Anthropic({ apiKey });
    }
  }

  /**
   * Generate a daily briefing from scored items.
   *
   * @param scoredItems - Scored items from PriorityScorer
   * @param context - Optional additional context (e.g., current sprint goals)
   * @returns Result with Briefing or Error
   */
  async generate(
    scoredItems: ScoredItem[],
    context?: string
  ): Promise<Result<Briefing, Error>> {
    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(scoredItems, context);

      const response = await this.client.beta.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        betas: ['structured-outputs-2025-11-13'],
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        system: systemPrompt,
        // @ts-expect-error - response_format is part of structured outputs beta
        response_format: {
          type: 'json_schema' as const,
          json_schema: {
            name: 'daily_briefing',
            strict: true,
            schema: zodToJsonSchema(BriefingSchema),
          },
        },
      });

      // Extract JSON from response
      const contentBlock = response.content[0];
      if (contentBlock.type !== 'text') {
        return err(new Error('Expected text response from Claude'));
      }

      // Parse and validate the JSON
      const briefingData = JSON.parse(contentBlock.text);
      const parseResult = BriefingSchema.safeParse(briefingData);

      if (!parseResult.success) {
        return err(
          new Error(
            `Briefing validation failed: ${parseResult.error.message}`
          )
        );
      }

      return ok(parseResult.data);
    } catch (error) {
      if (error instanceof Error) {
        return err(error);
      }
      return err(new Error(`Unknown error generating briefing: ${error}`));
    }
  }

  /**
   * Build system prompt with style and instructions.
   */
  private buildSystemPrompt(): string {
    const style = this.config.preferences.response_style;
    const length = this.config.preferences.briefing_length;

    const styleGuidance =
      style === 'professional'
        ? 'Use professional, concise language. Avoid casual phrases or humor.'
        : 'Use friendly, conversational tone. Be approachable and clear.';

    const lengthGuidance =
      length === 'concise'
        ? 'Keep all explanations brief and to the point (1-2 sentences max).'
        : 'Provide more detailed context and explanations (2-4 sentences).';

    return `You are an AI assistant helping with daily work prioritization.

Your task is to analyze scored work items and pull requests, then generate a structured briefing.

Style: ${styleGuidance}
Length: ${lengthGuidance}

Instructions:
1. Identify the top 5 highest-priority items based on scores
2. Identify the top 3 items that need a response (comments, reviews, status updates)
3. For items needing response, draft a suggested response matching the style preference
4. Identify any blockers or risks mentioned in the items
5. Write a 2-3 sentence summary of the overall situation

The output must follow the exact JSON schema provided.`;
  }

  /**
   * Build user prompt with scored items and context.
   */
  private buildUserPrompt(scoredItems: ScoredItem[], context?: string): string {
    let prompt = '';

    if (context) {
      prompt += `Context: ${context}\n\n`;
    }

    prompt += `Scored items (score, applied rules, details):\n\n`;

    for (const scored of scoredItems) {
      const item = scored.item;
      const rulesApplied = scored.appliedRules
        .map((r) => `${r.name}(${r.weight})`)
        .join(', ');

      if (item.type === 'work_item') {
        prompt += `[Score: ${scored.score}] Work Item #${item.item.id}\n`;
        prompt += `  Title: ${item.item.title}\n`;
        prompt += `  State: ${item.item.state}\n`;
        prompt += `  Priority: P${item.item.priority || 'none'}\n`;
        if (item.item.assignedTo) {
          prompt += `  Assigned to: ${item.item.assignedTo}\n`;
        }
        if (item.item.tags && item.item.tags.length > 0) {
          prompt += `  Tags: ${item.item.tags.join(', ')}\n`;
        }
        prompt += `  Scoring rules: ${rulesApplied || 'none'}\n`;
        prompt += '\n';
      } else if (item.type === 'pull_request') {
        prompt += `[Score: ${scored.score}] Pull Request #${item.item.id}\n`;
        prompt += `  Title: ${item.item.title}\n`;
        prompt += `  Repository: ${item.item.repository}\n`;
        prompt += `  Author: ${item.item.author}\n`;
        prompt += `  Status: ${item.item.status}\n`;
        prompt += `  Reviewer summary: ${item.item.reviewerSummary}\n`;
        prompt += `  Scoring rules: ${rulesApplied || 'none'}\n`;
        prompt += '\n';
      }
    }

    prompt += `\nGenerate a structured briefing following the provided schema.`;

    return prompt;
  }
}

/**
 * Convert Zod schema to JSON Schema for Claude structured outputs.
 * This is a simplified converter for the specific schemas we use.
 *
 * Note: In production, consider using a library like zod-to-json-schema.
 * For now, we'll manually define the JSON schema to match our Zod schemas.
 */
function zodToJsonSchema(schema: typeof BriefingSchema): object {
  return {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: 'Overall briefing summary (2-3 sentences)',
      },
      top_priorities: {
        type: 'array',
        description: 'Top 5 focus items for the day',
        maxItems: 5,
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Work item ID or PR ID',
            },
            type: {
              type: 'string',
              enum: ['work_item', 'pull_request'],
              description: 'Type of item',
            },
            title: {
              type: 'string',
              description: 'Title of the item',
            },
            priority_reason: {
              type: 'string',
              description: 'Why this is high priority',
            },
            needs_response: {
              type: 'boolean',
              description: 'Whether this needs a response',
            },
            suggested_response: {
              type: 'string',
              description: 'Suggested response if needed',
            },
          },
          required: ['id', 'type', 'title', 'priority_reason', 'needs_response'],
          additionalProperties: false,
        },
      },
      needs_response: {
        type: 'array',
        description: 'Top 3 items requiring a response',
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Work item ID or PR ID',
            },
            type: {
              type: 'string',
              enum: ['work_item', 'pull_request'],
              description: 'Type of item',
            },
            title: {
              type: 'string',
              description: 'Title of the item',
            },
            priority_reason: {
              type: 'string',
              description: 'Why this is high priority',
            },
            needs_response: {
              type: 'boolean',
              description: 'Whether this needs a response',
            },
            suggested_response: {
              type: 'string',
              description: 'Suggested response if needed',
            },
          },
          required: ['id', 'type', 'title', 'priority_reason', 'needs_response'],
          additionalProperties: false,
        },
      },
      blockers: {
        type: 'array',
        description: 'Any risks or blockers identified',
        items: {
          type: 'string',
        },
      },
      timestamp: {
        type: 'string',
        description: 'ISO timestamp when briefing was generated',
      },
    },
    required: ['summary', 'top_priorities', 'needs_response', 'timestamp'],
    additionalProperties: false,
  };
}
