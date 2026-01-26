/**
 * Response generator for triage system.
 *
 * Uses Claude with structured outputs to generate multiple response options
 * with tone adaptation based on recipient type (VIP vs peer).
 */

import Anthropic from '@anthropic-ai/sdk';
import { Result, ok, err } from 'neverthrow';
import type { OpsConfig } from '../config/schema.js';
import type { BriefingItem } from './schemas.js';
import { ResponseDraftSchema, type ResponseDraft } from './schemas.js';

/**
 * Context for generating response drafts.
 * Contains item details and recipient information for tone adaptation.
 */
export interface ResponseContext {
  /** The briefing item to respond to */
  item: BriefingItem;
  /** Type discriminant for the item */
  itemType: 'work_item' | 'pull_request';
  /** Name of the recipient (if known) */
  recipientName?: string;
  /** Role/title of the recipient (if VIP) */
  recipientRole?: string;
  /** Whether the recipient is a VIP */
  isVIP: boolean;
  /** Numeric priority score (1-10) */
  priority: number;
}

/**
 * Generates structured response drafts using Claude AI.
 *
 * Takes a response context with item and recipient details, then produces
 * 2-3 distinct response options with appropriate tone adaptation.
 */
export class ResponseGenerator {
  private config: OpsConfig;
  private client: Anthropic;

  /**
   * Create a response generator.
   *
   * @param config - Ops configuration with response preferences
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
            'Set it to use the response generator.'
        );
      }
      this.client = new Anthropic({ apiKey });
    }
  }

  /**
   * Generate response options for a briefing item.
   *
   * @param context - Response context with item and recipient details
   * @returns Result with ResponseDraft or Error
   */
  async generate(context: ResponseContext): Promise<Result<ResponseDraft, Error>> {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const userPrompt = this.buildUserPrompt(context);

      const response = await this.client.beta.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
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
            name: 'response_draft',
            strict: true,
            schema: zodToJsonSchema(ResponseDraftSchema),
          },
        },
      });

      // Extract JSON from response
      const contentBlock = response.content[0];
      if (contentBlock.type !== 'text') {
        return err(new Error('Expected text response from Claude'));
      }

      // Parse and validate the JSON
      const draftData = JSON.parse(contentBlock.text);
      const parseResult = ResponseDraftSchema.safeParse(draftData);

      if (!parseResult.success) {
        return err(
          new Error(
            `Response draft validation failed: ${parseResult.error.message}`
          )
        );
      }

      return ok(parseResult.data);
    } catch (error) {
      if (error instanceof Error) {
        return err(error);
      }
      return err(new Error(`Unknown error generating response draft: ${error}`));
    }
  }

  /**
   * Build system prompt with tone guidance.
   */
  private buildSystemPrompt(context: ResponseContext): string {
    const toneGuidance = buildToneGuidance(context, this.config.preferences);

    return `You are a professional communication assistant helping draft responses for work items.

${toneGuidance}

Your task:
1. Understand the item context and priority
2. Generate 2-3 DISTINCT response options
3. Each option should differ in approach, length, or emphasis (not just wording)
4. Match the tone to the recipient relationship
5. Make responses actionable and clear

The output must follow the exact JSON schema provided.`;
  }

  /**
   * Build user prompt with item context.
   */
  private buildUserPrompt(context: ResponseContext): string {
    const recipientInfo = context.isVIP
      ? `⚠️ VIP: ${context.recipientRole || 'Leadership'} (priority: ${context.priority}/10)`
      : '(Peer/teammate)';

    const suggestedResponse = context.item.suggested_response
      ? `\n\nBriefing suggested: "${context.item.suggested_response}"\n\nGenerate NEW options with different approaches (don't just rephrase this).`
      : '';

    return `Draft response options for this item.

Item: ${context.item.title}
Type: ${context.itemType}
Priority reason: ${context.item.priority_reason}

Recipient: ${context.recipientName || 'Team member'}
${recipientInfo}${suggestedResponse}

Generate 2-3 response options:
- Option 1: Most appropriate for this situation (recommended)
- Option 2: Alternative approach (e.g., different length or focus)
- Option 3 (optional): Different style or emphasis

Each option must be:
- Complete and ready to send
- Tonally appropriate for recipient
- Distinct from other options (different approach, not minor rewording)`;
  }
}

/**
 * Build tone guidance based on recipient type and preferences.
 *
 * @param context - Response context with VIP status
 * @param prefs - User preferences from config
 * @returns Tone guidance text for system prompt
 */
function buildToneGuidance(
  context: ResponseContext,
  prefs: OpsConfig['preferences']
): string {
  if (context.isVIP) {
    return `TONE: Formal and respectful (VIP communication)

Communicating with: ${context.recipientRole || 'Leadership'}
Style: Professional, structured, respectful
- Use complete sentences and proper grammar
- Be concise but thorough
- Avoid casual phrases, slang, or humor
- Lead with key information
- Use "I" statements for ownership
- Salutation: "Hi [Name]," or "Hello [Name],"
- Closing: "Best regards," or "Thank you,"

Structure:
1. Acknowledge their request/concern
2. Provide status or response
3. State next steps or ask for input`;
  }

  const casualness =
    prefs.response_style === 'casual'
      ? 'friendly and conversational'
      : 'professional but approachable';

  return `TONE: ${casualness} (peer communication)

Communicating with: Teammate or peer
Style: Direct, clear, conversational
- Be direct and get to the point
- Use natural language (contractions OK: I'll, we're)
- Brief but complete
- Can be more casual but stay professional
- Salutation: "Hey [Name]," or "Hi [Name],"
- Closing: "Thanks!" or "Cheers,"

Structure:
1. Get to the point quickly
2. Provide necessary context
3. Clear next steps or questions`;
}

/**
 * Convert Zod schema to JSON Schema for Claude structured outputs.
 * This is a simplified converter for the response draft schema.
 *
 * Note: In production, consider using a library like zod-to-json-schema.
 * For now, we'll manually define the JSON schema to match our Zod schemas.
 */
function zodToJsonSchema(schema: typeof ResponseDraftSchema): object {
  return {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: '1-2 sentence summary of the situation requiring response',
      },
      options: {
        type: 'array',
        description: '2-3 distinct response options with different approaches',
        minItems: 2,
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            label: {
              type: 'string',
              description: "Short descriptive label (e.g., 'Detailed', 'Brief', 'Action-focused')",
            },
            tone: {
              type: 'string',
              enum: ['formal', 'balanced', 'casual'],
              description: 'Tone level for this option',
            },
            text: {
              type: 'string',
              description: 'Complete response text, ready to send',
            },
            rationale: {
              type: 'string',
              description: '1-2 sentence explanation of why this approach works',
            },
          },
          required: ['label', 'tone', 'text', 'rationale'],
          additionalProperties: false,
        },
      },
      context_notes: {
        type: 'array',
        description: 'Important context factors considered (VIP status, urgency, etc.)',
        items: {
          type: 'string',
        },
      },
    },
    required: ['summary', 'options', 'context_notes'],
    additionalProperties: false,
  };
}
