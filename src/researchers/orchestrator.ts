/**
 * Research orchestrator for parallel execution of multiple researchers.
 * Coordinates ADO and GSD researchers with graceful degradation.
 */

import { Result, ok, err } from 'neverthrow';
import type { Researcher, ResearcherOutput, ADOData, GSDData } from './types.js';

/**
 * Combined results from all researchers.
 * Each field contains a Result for graceful error handling.
 */
export interface ResearchResults {
  ado: Result<ResearcherOutput<ADOData>, Error>;
  gsd: Result<ResearcherOutput<GSDData>, Error>;
}

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
 * Orchestrator that executes multiple researchers in parallel.
 * Uses Promise.allSettled to ensure all researchers complete independently.
 */
export class ResearchOrchestrator {
  constructor(
    private adoResearcher: Researcher<ADOData>,
    private gsdResearcher: Researcher<GSDData>
  ) {}

  /**
   * Execute all researchers in parallel.
   * Returns ResearchResults with Result types for each researcher.
   */
  async execute(): Promise<ResearchResults> {
    const startTime = Date.now();
    console.log('[Orchestrator] Starting parallel research execution...');

    // Execute both researchers in parallel
    const results = await Promise.allSettled([
      this.adoResearcher.execute(),
      this.gsdResearcher.execute(),
    ]);

    const [adoResult, gsdResult] = results;

    // Convert PromiseSettledResult to Result type
    const ado: Result<ResearcherOutput<ADOData>, Error> = isFulfilled(adoResult)
      ? adoResult.value
      : err(adoResult.reason instanceof Error ? adoResult.reason : new Error('ADO researcher failed'));

    const gsd: Result<ResearcherOutput<GSDData>, Error> = isFulfilled(gsdResult)
      ? gsdResult.value
      : err(gsdResult.reason instanceof Error ? gsdResult.reason : new Error('GSD researcher failed'));

    const duration = Date.now() - startTime;
    console.log(`[Orchestrator] Research completed in ${duration}ms`);

    return { ado, gsd };
  }

  /**
   * Check if any research results are available.
   * Returns true if at least one researcher succeeded.
   */
  hasAnyResults(results: ResearchResults): boolean {
    return results.ado.isOk() || results.gsd.isOk();
  }

  /**
   * Get total number of items found across all successful researchers.
   */
  getTotalItems(results: ResearchResults): number {
    let total = 0;

    if (results.ado.isOk()) {
      total += results.ado.value.metadata.itemsFound;
    }

    if (results.gsd.isOk()) {
      total += results.gsd.value.metadata.itemsFound;
    }

    return total;
  }
}
