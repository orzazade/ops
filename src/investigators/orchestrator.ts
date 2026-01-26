/**
 * Investigation orchestrator for parallel execution of multiple investigators.
 * Coordinates code, ticket, and wiki investigators with graceful degradation.
 */

import { Result, ok, err } from 'neverthrow';
import type {
  Investigator,
  InvestigationContext,
  InvestigationResults,
  CodeFindings,
  TicketFindings,
  WikiFindings,
} from './types.js';

/**
 * Type guards for settled promise results.
 */
function isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled';
}

function isRejected<T>(result: PromiseSettledResult<T>): result is PromiseRejectedResult {
  return result.status === 'rejected';
}

/**
 * Orchestrator that executes multiple investigators in parallel.
 * Uses Promise.allSettled to ensure all investigators complete independently.
 */
export class InvestigationOrchestrator {
  constructor(
    private codeInvestigator: Investigator<CodeFindings>,
    private ticketInvestigator: Investigator<TicketFindings>,
    private wikiInvestigator: Investigator<WikiFindings>
  ) {}

  /**
   * Execute all investigators in parallel.
   * Returns InvestigationResults with Result types for each investigator.
   */
  async investigate(context: InvestigationContext): Promise<InvestigationResults> {
    const startTime = Date.now();
    console.log(`[Orchestrator] Starting investigation for ticket #${context.ticketId}...`);

    // Execute all three investigators in parallel
    const results = await Promise.allSettled([
      this.codeInvestigator.execute(context),
      this.ticketInvestigator.execute(context),
      this.wikiInvestigator.execute(context),
    ]);

    const [codeResult, ticketResult, wikiResult] = results;

    // Convert PromiseSettledResult to Result type
    const code: Result<CodeFindings, Error> = isFulfilled(codeResult)
      ? codeResult.value
      : err(codeResult.reason instanceof Error ? codeResult.reason : new Error('Code investigation failed'));

    const tickets: Result<TicketFindings, Error> = isFulfilled(ticketResult)
      ? ticketResult.value
      : err(ticketResult.reason instanceof Error ? ticketResult.reason : new Error('Ticket investigation failed'));

    const wiki: Result<WikiFindings, Error> = isFulfilled(wikiResult)
      ? wikiResult.value
      : err(wikiResult.reason instanceof Error ? wikiResult.reason : new Error('Wiki investigation failed'));

    // Log partial failures
    if (code.isErr()) {
      console.warn('[Orchestrator] ⚠️  Code investigation failed:', code.error.message);
    }
    if (tickets.isErr()) {
      console.warn('[Orchestrator] ⚠️  Ticket investigation failed:', tickets.error.message);
    }
    if (wiki.isErr()) {
      console.warn('[Orchestrator] ⚠️  Wiki investigation failed:', wiki.error.message);
    }

    const duration = Date.now() - startTime;
    console.log(`[Orchestrator] Investigation completed in ${duration}ms`);

    return { code, tickets, wiki };
  }

  /**
   * Check if any investigation results are available.
   * Returns true if at least one investigator succeeded.
   */
  hasAnyResults(results: InvestigationResults): boolean {
    return results.code.isOk() || results.tickets.isOk() || results.wiki.isOk();
  }

  /**
   * Get count of successful investigators.
   * Used for confidence calculation (3=HIGH, 2=MEDIUM, 1=LOW).
   */
  getSuccessCount(results: InvestigationResults): number {
    let count = 0;
    if (results.code.isOk()) count++;
    if (results.tickets.isOk()) count++;
    if (results.wiki.isOk()) count++;
    return count;
  }
}
