/**
 * Morning workflow orchestrator.
 * Coordinates all components end-to-end: researchers, context, triage, history.
 */

import { Result, ok, err } from 'neverthrow';
import { loadOrPromptConfig } from '../config/loader.js';
import { initializeStateDirs } from '../state/init.js';
import { ResearchOrchestrator } from '../researchers/orchestrator.js';
import { ADOResearcher } from '../researchers/ado-researcher.js';
import { GSDResearcher } from '../researchers/gsd-researcher.js';
import { ContextEngine } from '../context/engine.js';
import { PriorityScorer } from '../triage/scorer.js';
import { BriefingGenerator } from '../triage/briefing.js';
import { persistBriefing, loadYesterdayBriefing } from './history-persistence.js';
import { identifyCarryover } from './carryover.js';
import { compressWorkItem, compressPR } from '../context/compression.js';
import type { Briefing } from '../triage/schemas.js';
import type { ResearchResults } from '../researchers/orchestrator.js';
import type { ScoreableItem } from '../triage/types.js';

/**
 * Result of morning workflow execution.
 * Includes briefing, degradation tier, warnings, and carryover stats.
 */
export interface MorningWorkflowResult {
  briefing: Briefing;
  tier: number; // Degradation tier (1-5)
  warnings: string[]; // Partial data warnings
  carryover?: {
    count: number;
    newCount: number;
  };
}

/**
 * Result of data gathering (without LLM briefing generation).
 * Used for Claude Code skill integration where Claude generates the briefing.
 */
export interface MorningDataResult {
  context: string; // XML context from ContextEngine
  scoredItems: Array<{
    id: number;
    type: 'work_item' | 'pull_request';
    title: string;
    score: number;
    appliedRules: string[];
    priority?: number;
    state?: string;
    assignedTo?: string;
  }>;
  tier: number;
  warnings: string[];
  yesterday?: Briefing;
}

/**
 * Determine briefing degradation tier based on available data.
 *
 * Tier 1: ADO + GSD + Yesterday (best case)
 * Tier 2: ADO + GSD (no history)
 * Tier 3: ADO only OR GSD only (partial)
 * Tier 4: Yesterday only (no new data)
 * Tier 5: No data at all (worst case)
 *
 * @param results - Research results from orchestrator
 * @param hasYesterday - Whether yesterday's briefing was available
 * @returns Degradation tier (1-5)
 */
export function determineBriefingTier(
  results: ResearchResults,
  hasYesterday: boolean
): number {
  const hasADO = results.ado.isOk();
  const hasGSD = results.gsd.isOk();

  if (hasADO && hasGSD && hasYesterday) return 1;
  if (hasADO && hasGSD) return 2;
  if (hasADO || hasGSD) return 3;
  if (hasYesterday) return 4;
  return 5;
}

/**
 * Generate warnings based on research results.
 *
 * @param results - Research results from orchestrator
 * @returns Array of warning messages
 */
function generateWarnings(results: ResearchResults): string[] {
  const warnings: string[] = [];

  if (results.ado.isErr()) {
    warnings.push(
      `ADO researcher failed: ${results.ado.error.message}. Briefing will not include Azure DevOps data.`
    );
  } else if (results.ado.value.status === 'partial') {
    warnings.push(
      `ADO researcher returned partial data. Some work items or pull requests may be missing.`
    );
  }

  if (results.gsd.isErr()) {
    warnings.push(
      `GSD researcher failed: ${results.gsd.error.message}. Briefing will not include project data.`
    );
  } else if (results.gsd.value.status === 'partial') {
    warnings.push(
      `GSD researcher returned partial data. Some projects may be missing.`
    );
  }

  return warnings;
}

/**
 * Convert research results to scoreable items.
 * Compresses work items and pull requests from ADO researcher.
 *
 * @param results - Research results from orchestrator
 * @returns Array of scoreable items
 */
function extractScoreableItems(results: ResearchResults): ScoreableItem[] {
  const items: ScoreableItem[] = [];

  if (results.ado.isOk()) {
    const { workItems, pullRequests } = results.ado.value.data;

    // Compress and add work items
    for (const workItem of workItems) {
      items.push({
        type: 'work_item',
        item: compressWorkItem(workItem),
      });
    }

    // Compress and add pull requests
    for (const pr of pullRequests) {
      items.push({
        type: 'pull_request',
        item: compressPR(pr),
      });
    }
  }

  return items;
}

/**
 * Execute the complete morning workflow.
 *
 * Orchestrates:
 * 1. Config loading
 * 2. State initialization
 * 3. Yesterday's briefing loading
 * 4. Research execution (ADO + GSD in parallel)
 * 5. Context building
 * 6. Priority scoring
 * 7. Briefing generation
 * 8. Carryover identification
 * 9. Briefing persistence
 *
 * Graceful degradation:
 * - Partial researcher failures continue with available data
 * - Missing yesterday's briefing is non-fatal
 * - All errors produce actionable error messages
 *
 * @returns Result with MorningWorkflowResult or Error
 */
export async function executeMorningWorkflow(): Promise<
  Result<MorningWorkflowResult, Error>
> {
  try {
    console.log('[MorningWorkflow] Starting execution...');

    // 1. Load config (fatal if missing)
    console.log('[MorningWorkflow] Loading config...');
    const config = await loadOrPromptConfig();

    // 2. Initialize state directories
    console.log('[MorningWorkflow] Initializing state directories...');
    await initializeStateDirs();

    // 3. Load yesterday's briefing (non-fatal)
    console.log('[MorningWorkflow] Loading yesterday briefing...');
    const yesterday = await loadYesterdayBriefing();
    if (yesterday) {
      console.log(
        `[MorningWorkflow] Found yesterday's briefing with ${yesterday.top_priorities.length} priorities`
      );
    } else {
      console.log('[MorningWorkflow] No yesterday briefing found');
    }

    // 4. Execute researchers in parallel
    console.log('[MorningWorkflow] Executing researchers...');

    // Get PAT from environment
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
      pat,
    });
    const gsdResearcher = new GSDResearcher();

    const orchestrator = new ResearchOrchestrator(adoResearcher, gsdResearcher);
    const results = await orchestrator.execute();

    // 5. Determine degradation tier and generate warnings
    const tier = determineBriefingTier(results, yesterday !== undefined);
    const warnings = generateWarnings(results);

    console.log(
      `[MorningWorkflow] Degradation tier: ${tier}, warnings: ${warnings.length}`
    );

    // Handle tier 5 (no data at all)
    if (tier === 5) {
      const errorBriefing: Briefing = {
        summary:
          'Unable to generate briefing - no data available from researchers. Check your configuration and network connection.',
        top_priorities: [],
        needs_response: [],
        blockers: [
          'ADO researcher failed - check AZURE_DEVOPS_PAT and network connection',
          'GSD researcher failed - check file system permissions',
        ],
        timestamp: new Date().toISOString(),
      };

      // Persist error briefing for debugging
      await persistBriefing(errorBriefing);

      return ok({
        briefing: errorBriefing,
        tier,
        warnings,
      });
    }

    // Handle tier 4 (yesterday only, no new data)
    if (tier === 4 && yesterday) {
      const fallbackBriefing: Briefing = {
        summary:
          'No new data available today. Here are yesterday\'s priorities for reference.',
        top_priorities: yesterday.top_priorities,
        needs_response: yesterday.needs_response,
        blockers: [
          ...(yesterday.blockers || []),
          'No new data from researchers - showing yesterday\'s briefing',
        ],
        timestamp: new Date().toISOString(),
      };

      await persistBriefing(fallbackBriefing);

      return ok({
        briefing: fallbackBriefing,
        tier,
        warnings,
        carryover: {
          count: yesterday.top_priorities.length,
          newCount: 0,
        },
      });
    }

    // 6. Build context with ContextEngine
    console.log('[MorningWorkflow] Building context...');
    const contextEngine = new ContextEngine({
      totalBudget: 4000,
    });

    const contextResult = await contextEngine.fromResearchResults(results);

    if (contextResult.isErr()) {
      return err(
        new Error(
          `Context building failed: ${contextResult.error.message}. Unable to generate briefing.`
        )
      );
    }

    const context = contextResult.value;
    const stats = contextEngine.getStats();
    console.log(
      `[MorningWorkflow] Context built: ${stats.totalTokens} tokens, ${stats.sectionCount} sections`
    );

    // 7. Score items with PriorityScorer
    console.log('[MorningWorkflow] Scoring items...');
    const scorer = new PriorityScorer(config);
    const scoreableItems = extractScoreableItems(results);
    const scoredItems = scorer.scoreAll(scoreableItems);
    console.log(`[MorningWorkflow] Scored ${scoredItems.length} items`);

    // 8. Generate briefing with BriefingGenerator
    console.log('[MorningWorkflow] Generating briefing...');
    const generator = new BriefingGenerator(config);
    const briefingResult = await generator.generate(scoredItems, context);

    if (briefingResult.isErr()) {
      return err(
        new Error(
          `Briefing generation failed: ${briefingResult.error.message}. ` +
            'Check ANTHROPIC_API_KEY and network connection.'
        )
      );
    }

    const briefing = briefingResult.value;
    console.log(
      `[MorningWorkflow] Briefing generated with ${briefing.top_priorities.length} priorities`
    );

    // 9. Identify carryover if yesterday exists
    let carryover: { count: number; newCount: number } | undefined;

    if (yesterday) {
      const allTodayItems = [
        ...briefing.top_priorities,
        ...briefing.needs_response,
      ];
      const carryoverResult = identifyCarryover(allTodayItems, yesterday);
      carryover = {
        count: carryoverResult.carryover.length,
        newCount: carryoverResult.new.length,
      };
      console.log(
        `[MorningWorkflow] Carryover: ${carryover.count} items, ${carryover.newCount} new`
      );
    }

    // 10. Persist briefing to history
    console.log('[MorningWorkflow] Persisting briefing...');
    await persistBriefing(briefing);

    console.log('[MorningWorkflow] Workflow complete!');

    return ok({
      briefing,
      tier,
      warnings,
      carryover,
    });
  } catch (error) {
    if (error instanceof Error) {
      return err(error);
    }
    return err(new Error(`Unknown error in morning workflow: ${error}`));
  }
}

/**
 * Gather morning data without LLM briefing generation.
 *
 * Use this for Claude Code skill integration where Claude generates
 * the briefing from the gathered and scored data.
 *
 * Orchestrates:
 * 1. Config loading
 * 2. State initialization
 * 3. Yesterday's briefing loading
 * 4. Research execution (ADO + GSD in parallel)
 * 5. Context building
 * 6. Priority scoring
 *
 * Does NOT:
 * - Call Anthropic API for briefing generation
 * - Persist briefing (caller's responsibility after Claude generates it)
 *
 * @returns Result with MorningDataResult or Error
 */
export async function gatherMorningData(): Promise<
  Result<MorningDataResult, Error>
> {
  try {
    console.log('[MorningWorkflow] Gathering morning data...');

    // 1. Load config (fatal if missing)
    console.log('[MorningWorkflow] Loading config...');
    const config = await loadOrPromptConfig();

    // 2. Initialize state directories
    console.log('[MorningWorkflow] Initializing state directories...');
    await initializeStateDirs();

    // 3. Load yesterday's briefing (non-fatal)
    console.log('[MorningWorkflow] Loading yesterday briefing...');
    const yesterday = await loadYesterdayBriefing();
    if (yesterday) {
      console.log(
        `[MorningWorkflow] Found yesterday's briefing with ${yesterday.top_priorities.length} priorities`
      );
    } else {
      console.log('[MorningWorkflow] No yesterday briefing found');
    }

    // 4. Execute researchers in parallel
    console.log('[MorningWorkflow] Executing researchers...');

    // Get PAT from environment
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
      pat,
    });
    const gsdResearcher = new GSDResearcher();

    const orchestrator = new ResearchOrchestrator(adoResearcher, gsdResearcher);
    const results = await orchestrator.execute();

    // 5. Determine degradation tier and generate warnings
    const tier = determineBriefingTier(results, yesterday !== undefined);
    const warnings = generateWarnings(results);

    console.log(
      `[MorningWorkflow] Degradation tier: ${tier}, warnings: ${warnings.length}`
    );

    // Handle tier 5 (no data at all) - return empty result
    if (tier === 5) {
      return ok({
        context: '<morning-context><error>No data available from researchers</error></morning-context>',
        scoredItems: [],
        tier,
        warnings: [
          ...warnings,
          'ADO researcher failed - check AZURE_DEVOPS_PAT and network connection',
          'GSD researcher failed - check file system permissions',
        ],
        yesterday,
      });
    }

    // Handle tier 4 (yesterday only, no new data)
    if (tier === 4) {
      return ok({
        context: '<morning-context><info>No new data today - showing yesterday\'s context</info></morning-context>',
        scoredItems: [],
        tier,
        warnings,
        yesterday,
      });
    }

    // 6. Build context with ContextEngine
    console.log('[MorningWorkflow] Building context...');
    const contextEngine = new ContextEngine({
      totalBudget: 4000,
    });

    const contextResult = await contextEngine.fromResearchResults(results);

    if (contextResult.isErr()) {
      return err(
        new Error(
          `Context building failed: ${contextResult.error.message}. Unable to gather data.`
        )
      );
    }

    const context = contextResult.value;
    const stats = contextEngine.getStats();
    console.log(
      `[MorningWorkflow] Context built: ${stats.totalTokens} tokens, ${stats.sectionCount} sections`
    );

    // 7. Score items with PriorityScorer
    console.log('[MorningWorkflow] Scoring items...');
    const scorer = new PriorityScorer(config);
    const scoreableItems = extractScoreableItems(results);
    const scoredItems = scorer.scoreAll(scoreableItems);
    console.log(`[MorningWorkflow] Scored ${scoredItems.length} items`);

    // Transform scored items to simpler format for output
    const simplifiedItems = scoredItems.map((scored) => ({
      id: scored.item.item.id,
      type: scored.item.type,
      title: scored.item.item.title,
      score: scored.score,
      appliedRules: scored.appliedRules.map(r => r.name),
      priority: scored.item.type === 'work_item' ? (scored.item.item as any).priority : undefined,
      state: scored.item.type === 'work_item' ? (scored.item.item as any).state : (scored.item.item as any).status,
      assignedTo: scored.item.type === 'work_item' ? (scored.item.item as any).assignedTo : (scored.item.item as any).author,
    }));

    console.log('[MorningWorkflow] Data gathering complete!');

    return ok({
      context,
      scoredItems: simplifiedItems,
      tier,
      warnings,
      yesterday,
    });
  } catch (error) {
    if (error instanceof Error) {
      return err(error);
    }
    return err(new Error(`Unknown error gathering morning data: ${error}`));
  }
}
