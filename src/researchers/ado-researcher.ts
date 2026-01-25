/**
 * Azure DevOps researcher implementation.
 * Fetches work items and pull requests from ADO.
 */

import { ok, err, type Result } from 'neverthrow';
import { ADOClient } from '../azure/client.js';
import { mapWorkItem, mapPullRequest } from '../azure/mappers.js';
import type { Researcher, ResearcherOutput, ADOData } from './types.js';
import type { ADOConfig } from '../config/schema.js';

export interface ADOResearcherConfig extends ADOConfig {
  pat: string;
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
 * Researcher implementation for Azure DevOps.
 * Fetches work items and pull requests in parallel with graceful degradation.
 */
export class ADOResearcher implements Researcher<ADOData> {
  public readonly name = 'ado-researcher';
  private client: ADOClient;

  constructor(private config: ADOResearcherConfig) {
    this.client = new ADOClient({
      organization: config.organization,
      project: config.default_project || '',
      pat: config.pat,
    });
  }

  /**
   * Execute research to fetch ADO data.
   * Returns success if both succeed, partial if one fails, error if both fail.
   */
  async execute(): Promise<Result<ResearcherOutput<ADOData>, Error>> {
    const startTime = Date.now();

    // Fetch work items and PRs in parallel with graceful degradation
    const results = await Promise.allSettled([
      this.client.fetchWorkItems(),
      this.client.fetchPullRequests(),
    ]);

    const [workItemsResult, prsResult] = results;

    // Extract successful results
    const workItems = isFulfilled(workItemsResult)
      ? workItemsResult.value.map(mapWorkItem)
      : [];

    const pullRequests = isFulfilled(prsResult)
      ? prsResult.value.map(mapPullRequest)
      : [];

    // Collect errors from failed operations
    const errors: string[] = [];
    if (isRejected(workItemsResult)) {
      errors.push(workItemsResult.reason?.message || 'Work item query failed');
    }
    if (isRejected(prsResult)) {
      errors.push(prsResult.reason?.message || 'Pull request fetch failed');
    }

    // Determine status
    const bothSucceeded = isFulfilled(workItemsResult) && isFulfilled(prsResult);
    const bothFailed = isRejected(workItemsResult) && isRejected(prsResult);

    // If both failed, return error
    if (bothFailed) {
      return err(new Error(`Both work items and pull requests failed: ${errors.join('; ')}`));
    }

    const status = bothSucceeded ? 'success' : 'partial';
    const duration_ms = Date.now() - startTime;

    const output: ResearcherOutput<ADOData> = {
      source: 'azure-devops',
      status,
      data: {
        workItems,
        pullRequests,
      },
      metadata: {
        timestamp: new Date(),
        duration_ms,
        itemsFound: workItems.length + pullRequests.length,
      },
      ...(errors.length > 0 && { errors }),
    };

    return ok(output);
  }
}
