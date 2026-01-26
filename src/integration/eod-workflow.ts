/**
 * EOD (End-of-Day) workflow orchestrator.
 *
 * Coordinates all EOD analysis: accomplishment tracking, blocker age calculation,
 * and carryover reason inference. Follows the priorities-workflow pattern with
 * 4-tier degradation system for graceful handling of missing data.
 */

import { Result, ok, err } from 'neverthrow';
import { loadOrPromptConfig } from '../config/loader.js';
import { initializeStateDirs } from '../state/init.js';
import { ResearchOrchestrator } from '../researchers/orchestrator.js';
import { ADOResearcher } from '../researchers/ado-researcher.js';
import { GSDResearcher } from '../researchers/gsd-researcher.js';
import { PriorityScorer } from '../triage/scorer.js';
import { loadBriefing } from './history-persistence.js';
import { persistEOD, loadYesterdayEOD } from './eod-history.js';
import { detectAccomplishments } from './accomplishment-tracker.js';
import { calculateBlockerAgeWithYesterday } from './blocker-tracker.js';
import { analyzeCarryover } from './carryover-analyzer.js';
import { compressWorkItem, compressPR } from '../context/compression.js';
import type { Briefing, BriefingItem } from '../triage/schemas.js';
import type { EODSummary } from './eod-types.js';
import type { ScoreableItem } from '../triage/types.js';
import type { ResearchResults } from '../researchers/orchestrator.js';

/**
 * Result of EOD workflow execution.
 * Includes EOD summary, degradation tier, and warnings.
 */
export interface EODResult {
  summary: EODSummary;
  tier: number; // Degradation tier (1-4)
  warnings: string[]; // Partial data warnings
}

/**
 * Determine EOD degradation tier based on available data.
 *
 * Tier 1: ADO + GSD + Morning briefing (best case - full day comparison)
 * Tier 2: ADO + GSD only (no morning baseline - can't track accomplishments)
 * Tier 3: ADO only OR GSD only (partial current state)
 * Tier 4: No data at all (worst case - can't generate EOD)
 *
 * @param results - Research results from orchestrator
 * @param hasMorningBriefing - Whether today's morning briefing was available
 * @returns Degradation tier (1-4)
 */
export function determineEODTier(
  results: ResearchResults,
  hasMorningBriefing: boolean
): number {
  const hasADO = results.ado.isOk();
  const hasGSD = results.gsd.isOk();

  if (hasADO && hasGSD && hasMorningBriefing) return 1;
  if (hasADO && hasGSD) return 2;
  if (hasADO || hasGSD) return 3;
  return 4;
}

/**
 * Generate warnings based on research results and missing data.
 *
 * @param results - Research results from orchestrator
 * @param hasMorningBriefing - Whether morning briefing was available
 * @returns Array of warning messages
 */
function generateWarnings(
  results: ResearchResults,
  hasMorningBriefing: boolean
): string[] {
  const warnings: string[] = [];

  if (!hasMorningBriefing) {
    warnings.push(
      'No morning briefing found - accomplishment tracking limited to current state only'
    );
  }

  if (results.ado.isErr()) {
    warnings.push(
      `ADO researcher failed: ${results.ado.error.message}. EOD will not include Azure DevOps data.`
    );
  } else if (results.ado.value.status === 'partial') {
    warnings.push(
      'ADO researcher returned partial data. Some work items or pull requests may be missing.'
    );
  }

  if (results.gsd.isErr()) {
    warnings.push(
      `GSD researcher failed: ${results.gsd.error.message}. EOD will not include project data.`
    );
  } else if (results.gsd.value.status === 'partial') {
    warnings.push(
      'GSD researcher returned partial data. Some projects may be missing.'
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
 * Extract items marked as blocked from current state.
 * Items with priority_reason containing "blocked" are considered blockers.
 *
 * @param items - Current briefing items
 * @returns Items that are blocked
 */
function extractBlockers(items: BriefingItem[]): BriefingItem[] {
  return items.filter((item) =>
    item.priority_reason.toLowerCase().includes('blocked')
  );
}

/**
 * Execute the complete EOD workflow.
 *
 * Orchestrates:
 * 1. Config loading
 * 2. State initialization
 * 3. Morning briefing loading (baseline for accomplishment tracking)
 * 4. Yesterday's EOD loading (for blocker age tracking)
 * 5. Research execution (ADO + GSD in parallel)
 * 6. Current state scoring (to get today's priorities)
 * 7. Accomplishment detection (comparing morning vs current)
 * 8. Blocker age calculation (comparing yesterday vs current)
 * 9. Carryover analysis (inferring reasons)
 * 10. EOD summary generation
 * 11. EOD persistence for tomorrow's blocker age tracking
 *
 * Graceful degradation (4-tier system):
 * - Tier 1: Full data - complete accomplishment and blocker tracking
 * - Tier 2: No morning briefing - limited accomplishment tracking
 * - Tier 3: Partial research - incomplete current state
 * - Tier 4: No data - return error (can't generate meaningful EOD)
 *
 * @returns Result with EODResult or Error
 */
export async function executeEODWorkflow(): Promise<Result<EODResult, Error>> {
  try {
    console.error('[EODWorkflow] Starting execution...');

    // 1. Load config (fatal if missing)
    console.error('[EODWorkflow] Loading config...');
    const config = await loadOrPromptConfig();

    // 2. Initialize state directories
    console.error('[EODWorkflow] Initializing state directories...');
    await initializeStateDirs();

    // 3. Load today's morning briefing (baseline for accomplishments)
    console.error('[EODWorkflow] Loading morning briefing...');
    const today = new Date();
    const morningBriefing = await loadBriefing(today);

    if (morningBriefing) {
      console.error(
        `[EODWorkflow] Found morning briefing with ${morningBriefing.top_priorities.length} priorities`
      );
    } else {
      console.error('[EODWorkflow] No morning briefing found (accomplishment tracking limited)');
    }

    // 4. Load yesterday's EOD (for blocker age tracking)
    console.error('[EODWorkflow] Loading yesterday\'s EOD...');
    const yesterdayEOD = await loadYesterdayEOD();

    if (yesterdayEOD) {
      console.error(
        `[EODWorkflow] Found yesterday's EOD with ${yesterdayEOD.blockers.length} blockers`
      );
    } else {
      console.error('[EODWorkflow] No yesterday EOD found (blocker age starts at 1)');
    }

    // 5. Execute researchers in parallel
    console.error('[EODWorkflow] Executing researchers...');

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
      team: config.user?.team,
      pat,
    });
    const gsdResearcher = new GSDResearcher();
    const orchestrator = new ResearchOrchestrator(adoResearcher, gsdResearcher);
    const results = await orchestrator.execute();

    // Determine degradation tier
    const tier = determineEODTier(results, !!morningBriefing);
    console.error(`[EODWorkflow] Degradation tier: ${tier}`);

    // Generate warnings
    const warnings = generateWarnings(results, !!morningBriefing);

    // Tier 4 (no data) - can't generate EOD
    if (tier === 4) {
      return err(
        new Error(
          'Cannot generate EOD - no ADO or GSD data available. Check AZURE_DEVOPS_PAT and try again.'
        )
      );
    }

    // 6. Score current items to get today's priorities
    console.error('[EODWorkflow] Scoring current items...');
    const scorer = new PriorityScorer(config);
    const scoreableItems = extractScoreableItems(results);
    const scoredItems = scorer.scoreAll(scoreableItems);

    // Sort by score and take top items
    const sorted = scoredItems.sort((a, b) => b.score - a.score);
    const topCurrent = sorted.slice(0, 10); // Get top 10 for EOD context

    // Convert to briefing items
    const currentItems: BriefingItem[] = topCurrent.map((scored) => ({
      id: scored.item.item.id,
      type: scored.item.type,
      title: scored.item.item.title,
      priority_reason:
        scored.appliedRules.map((r) => r.name).join(', ') || 'default priority',
      needs_response: false,
    }));

    console.error(`[EODWorkflow] Found ${currentItems.length} current items`);

    // 7. Detect accomplishments (if morning briefing available)
    console.error('[EODWorkflow] Detecting accomplishments...');
    const accomplishments = morningBriefing
      ? detectAccomplishments({
          morningBriefing,
          currentItems,
          morningGSD: results.gsd.isOk() ? results.gsd.value.data : [],
          currentGSD: results.gsd.isOk() ? results.gsd.value.data : [],
        })
      : {
          completed: [],
          progressed: [],
          gsdProgress: [],
        };

    console.error(
      `[EODWorkflow] Accomplishments: ${accomplishments.completed.length} completed, ` +
        `${accomplishments.progressed.length} progressed, ${accomplishments.gsdProgress.length} GSD progress`
    );

    // 8. Calculate blocker age
    console.error('[EODWorkflow] Calculating blocker age...');
    const currentBlockers = extractBlockers(currentItems);
    const blockersWithAge = calculateBlockerAgeWithYesterday(
      currentBlockers,
      yesterdayEOD
    );

    console.error(
      `[EODWorkflow] Found ${blockersWithAge.length} blockers (ages: ${blockersWithAge.map((b) => b.daysBlocked).join(', ')})`
    );

    // 9. Analyze carryover (if morning briefing available)
    console.error('[EODWorkflow] Analyzing carryover...');
    const carryover = morningBriefing
      ? analyzeCarryover({
          morningBriefing,
          currentItems,
          completedItems: accomplishments.completed,
          progressedItems: accomplishments.progressed,
          blockers: blockersWithAge,
        })
      : [];

    console.error(
      `[EODWorkflow] Carryover: ${carryover.length} items (reasons: ${carryover.map((c) => c.reason).join(', ')})`
    );

    // 10. Generate EOD summary
    const eodDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const eodSummary: EODSummary = {
      date: eodDate,
      accomplishments,
      blockers: blockersWithAge,
      carryover,
      timestamp: new Date().toISOString(),
      morningBriefingTimestamp: morningBriefing?.timestamp,
    };

    // 11. Persist EOD for tomorrow's blocker age tracking
    console.error('[EODWorkflow] Persisting EOD...');
    await persistEOD(eodSummary, today);

    console.error('[EODWorkflow] Workflow complete!');

    return ok({
      summary: eodSummary,
      tier,
      warnings,
    });
  } catch (error) {
    if (error instanceof Error) {
      return err(error);
    }
    return err(new Error(`Unknown error in EOD workflow: ${error}`));
  }
}
