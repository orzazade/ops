/**
 * Response workflow for triage system.
 *
 * Extracts context from briefing history, detects VIP recipients,
 * and generates response drafts with appropriate tone adaptation.
 */

import { Result, ok, err } from 'neverthrow';
import { loadBriefing } from './history-persistence.js';
import { ResponseGenerator, type ResponseContext } from '../triage/index.js';
import type { ResponseDraft, BriefingItem, Briefing } from '../triage/schemas.js';
import { loadOrPromptConfig } from '../config/loader.js';
import type { OpsConfig } from '../config/schema.js';

/**
 * Load today's briefing, or undefined if not found.
 */
async function loadTodayBriefing(): Promise<Briefing | undefined> {
  const today = new Date();
  return await loadBriefing(today);
}

/**
 * Load yesterday's briefing, or undefined if not found.
 */
async function loadYesterdayBriefing(): Promise<Briefing | undefined> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return await loadBriefing(yesterday);
}

/**
 * Extract recipient name from item title or priority reason.
 * Looks for @mentions, "assigned to", "from", and "by" patterns.
 *
 * @param item - Briefing item to analyze
 * @returns Recipient name if found, undefined otherwise
 */
function extractRecipientName(item: BriefingItem): string | undefined {
  const textToSearch = `${item.title} ${item.priority_reason}`;

  // Try @mention pattern: @FirstName LastName
  const mentionMatch = textToSearch.match(/@(\w+\s+\w+)/);
  if (mentionMatch) {
    return mentionMatch[1];
  }

  // Try "assigned to FirstName LastName" pattern (case insensitive)
  const assignedMatch = textToSearch.match(/assigned to (\w+\s+\w+)/i);
  if (assignedMatch) {
    return assignedMatch[1];
  }

  // Try "from FirstName LastName" pattern (case insensitive)
  const fromMatch = textToSearch.match(/from (\w+\s+\w+)/i);
  if (fromMatch) {
    return fromMatch[1];
  }

  // Try "by FirstName LastName" pattern (case insensitive)
  const byMatch = textToSearch.match(/by (\w+\s+\w+)/i);
  if (byMatch) {
    return byMatch[1];
  }

  return undefined;
}

/**
 * Detect VIP status from recipient name and config.
 * Uses case-insensitive partial matching for flexible name matching.
 *
 * @param name - Recipient name (if known)
 * @param config - Ops configuration with VIP list
 * @returns VIP detection result with priority
 */
function detectVIP(
  name: string | undefined,
  config: OpsConfig
): { isVIP: boolean; vip?: OpsConfig['vips'][0]; priority: number } {
  if (!name) {
    return { isVIP: false, priority: 5 };
  }

  const nameLower = name.toLowerCase();

  // Case-insensitive partial match against VIP names
  for (const vip of config.vips) {
    const vipNameLower = vip.name.toLowerCase();
    if (vipNameLower.includes(nameLower) || nameLower.includes(vipNameLower)) {
      // Map priority levels to numeric values
      const priorityMap: Record<typeof vip.priority, number> = {
        highest: 10,
        high: 8,
        medium: 6,
        low: 4,
      };

      return {
        isVIP: true,
        vip,
        priority: priorityMap[vip.priority],
      };
    }
  }

  return { isVIP: false, priority: 5 };
}

/**
 * Extract response context from a briefing item identifier.
 * Loads briefing history, finds the item, and prepares context for response generation.
 *
 * @param itemIdentifier - Item ID (number) or title keyword (string)
 * @param config - Ops configuration for VIP detection
 * @returns Result with ResponseContext or Error
 */
async function extractResponseContext(
  itemIdentifier: string,
  config: OpsConfig
): Promise<Result<ResponseContext, Error>> {
  // Load today's briefing, fall back to yesterday if not found
  let briefing = await loadTodayBriefing();
  if (!briefing) {
    briefing = await loadYesterdayBriefing();
  }

  if (!briefing) {
    return err(
      new Error('No briefing data available. Run /ops:morning first.')
    );
  }

  // Combine all briefing items
  const allItems: BriefingItem[] = [
    ...briefing.top_priorities,
    ...briefing.needs_response,
  ];

  // Match by ID (if number) or title keyword (case-insensitive)
  const identifierLower = itemIdentifier.toLowerCase();
  const isNumericId = /^\d+$/.test(itemIdentifier);

  const matchedItem = allItems.find(item => {
    if (isNumericId) {
      return item.id === parseInt(itemIdentifier, 10);
    } else {
      return item.title.toLowerCase().includes(identifierLower);
    }
  });

  if (!matchedItem) {
    // Generate helpful error message with available items
    const availableItems = allItems
      .map(item => `  - #${item.id}: ${item.title}`)
      .join('\n');

    return err(
      new Error(
        `Item not found: "${itemIdentifier}"\n\nAvailable items:\n${availableItems}`
      )
    );
  }

  // Extract recipient name and detect VIP status
  const recipientName = extractRecipientName(matchedItem);
  const vipResult = detectVIP(recipientName, config);

  // Build response context
  const context: ResponseContext = {
    item: matchedItem,
    itemType: matchedItem.type,
    recipientName,
    recipientRole: vipResult.vip?.role,
    isVIP: vipResult.isVIP,
    priority: vipResult.priority,
  };

  return ok(context);
}

/**
 * Generate response draft for a briefing item.
 * Main export for this workflow.
 *
 * @param itemIdentifier - Item ID or title keyword
 * @returns Result with draft and context, or Error
 */
export async function generateResponseDraft(
  itemIdentifier: string
): Promise<Result<{ draft: ResponseDraft; context: ResponseContext }, Error>> {
  try {
    // Load config (throws on error)
    const config = await loadOrPromptConfig();

    // Extract response context
    const contextResult = await extractResponseContext(itemIdentifier, config);
    if (contextResult.isErr()) {
      return err(contextResult.error);
    }
    const context = contextResult.value;

    // Log to stderr for debugging
    console.error(
      `[respond-workflow] Processing item #${context.item.id}: ${context.item.title}`
    );
    if (context.isVIP) {
      console.error(
        `[respond-workflow] VIP detected: ${context.recipientName} (${context.recipientRole}), priority ${context.priority}/10`
      );
    } else {
      console.error(
        `[respond-workflow] Peer communication, priority ${context.priority}/10`
      );
    }

    // Generate response draft
    const generator = new ResponseGenerator(config);
    const draftResult = await generator.generate(context);

    if (draftResult.isErr()) {
      return err(draftResult.error);
    }

    return ok({ draft: draftResult.value, context });
  } catch (error) {
    if (error instanceof Error) {
      return err(error);
    }
    return err(new Error(`Unknown error generating response draft: ${error}`));
  }
}
