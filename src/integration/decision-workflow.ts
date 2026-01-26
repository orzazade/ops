/**
 * Decision workflow orchestrator.
 *
 * Coordinates:
 * 1. Load config and initialize state
 * 2. Fetch fresh ADO data (ALWAYS fresh - priorities change)
 * 3. Score items with overrides
 * 4. Get current time context
 * 5. Generate recommendation
 *
 * Follows project pattern: CLI outputs XML, skill applies formatting.
 */

import { Result, ok, err } from 'neverthrow';
import { loadOrPromptConfig } from '../config/loader.js';
import { initializeStateDirs } from '../state/init.js';
import { ResearchOrchestrator } from '../researchers/orchestrator.js';
import { ADOResearcher } from '../researchers/ado-researcher.js';
import { GSDResearcher } from '../researchers/gsd-researcher.js';
import { PriorityScorer } from '../triage/scorer.js';
import { loadOverrides } from '../triage/overrides.js';
import { compressWorkItem, compressPR } from '../context/compression.js';
import { getTimeContext } from '../decision/time-context.js';
import { generateRecommendation } from '../decision/recommender.js';
import type { DecisionResult } from '../decision/types.js';
import type { TimeContext } from '../decision/time-context.js';
import type { ScoreableItem } from '../triage/types.js';

/**
 * Result of decision workflow execution.
 */
export interface DecisionWorkflowResult {
  decision: DecisionResult;
  timeContext: TimeContext;
  itemsEvaluated: number;
  warnings: string[];
}

/**
 * Extract scoreable items from research results.
 * Follows pattern from priorities-workflow.
 */
function extractScoreableItems(results: any): ScoreableItem[] {
  const items: ScoreableItem[] = [];

  if (results.ado.isOk()) {
    const adoData = results.ado.value.data;

    // Add work items
    if (adoData.workItems) {
      for (const wi of adoData.workItems) {
        const compressed = compressWorkItem(wi);
        items.push({ type: 'work_item', item: compressed });
      }
    }

    // Add PRs
    if (adoData.pullRequests) {
      for (const pr of adoData.pullRequests) {
        const compressed = compressPR(pr);
        items.push({ type: 'pull_request', item: compressed });
      }
    }
  }

  return items;
}

/**
 * Execute the decision workflow.
 *
 * ALWAYS fetches fresh data - priorities change frequently.
 * Uses time-of-day context to match work to available cognitive resources.
 *
 * @returns Result with DecisionWorkflowResult or Error
 */
export async function executeDecisionWorkflow(): Promise<Result<DecisionWorkflowResult, Error>> {
  try {
    console.error('[DecisionWorkflow] Starting execution...');

    const warnings: string[] = [];

    // 1. Load config (fatal if missing)
    console.error('[DecisionWorkflow] Loading config...');
    const config = await loadOrPromptConfig();

    // 2. Initialize state directories
    console.error('[DecisionWorkflow] Initializing state directories...');
    await initializeStateDirs();

    // 3. Fetch fresh ADO data (ALWAYS fresh)
    console.error('[DecisionWorkflow] Fetching fresh ADO data...');
    const pat = process.env.AZURE_DEVOPS_PAT;
    if (!pat) {
      return err(
        new Error(
          'AZURE_DEVOPS_PAT environment variable not set. ' +
            'Set it to authenticate with Azure DevOps.'
        )
      );
    }

    const adoResearcher = new ADOResearcher({
      ...config.azure,
      team: config.user?.team,
      pat,
    });
    const gsdResearcher = new GSDResearcher();
    const orchestrator = new ResearchOrchestrator(adoResearcher, gsdResearcher);
    const results = await orchestrator.execute();

    if (results.ado.isErr()) {
      return err(
        new Error(
          `ADO researcher failed: ${results.ado.error.message}. Cannot generate decision without ADO data.`
        )
      );
    }

    // 4. Score items with overrides
    console.error('[DecisionWorkflow] Scoring items...');
    const overrides = await loadOverrides();
    const scorer = new PriorityScorer(config);
    const scoreableItems = extractScoreableItems(results);
    const scoredItems = scorer.scoreAllWithOverrides(scoreableItems, overrides);

    console.error(`[DecisionWorkflow] Evaluated ${scoredItems.length} items`);

    // 5. Get current time context
    console.error('[DecisionWorkflow] Getting time context...');
    const timeContext = getTimeContext();
    console.error(`[DecisionWorkflow] Time context: ${timeContext.mode} - ${timeContext.reasoning}`);

    // 6. Generate recommendation
    console.error('[DecisionWorkflow] Generating recommendation...');
    const decision = generateRecommendation(scoredItems, timeContext);

    console.error('[DecisionWorkflow] Done.');

    return ok({
      decision,
      timeContext,
      itemsEvaluated: scoredItems.length,
      warnings,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
