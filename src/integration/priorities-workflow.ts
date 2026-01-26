/**
 * Priorities workflow orchestrator.
 *
 * Coordinates delta calculation, selective re-scoring, pin application,
 * and baseline handling for priority re-ranking throughout the day.
 */

import { Result, ok, err } from 'neverthrow';
import { loadOrPromptConfig } from '../config/loader.js';
import { initializeStateDirs } from '../state/init.js';
import { ResearchOrchestrator } from '../researchers/orchestrator.js';
import { ADOResearcher } from '../researchers/ado-researcher.js';
import { GSDResearcher } from '../researchers/gsd-researcher.js';
import { PriorityScorer } from '../triage/scorer.js';
import { loadBriefing, persistBriefing } from './history-persistence.js';
import { calculateDelta } from './delta-calculator.js';
import { loadPins, applyPins } from './pin-storage.js';
import { loadOverrides } from '../triage/overrides.js';
import { compressWorkItem, compressPR } from '../context/compression.js';
import { formatScoreHint } from '../formatters/score-explainer.js';
import type { Briefing, BriefingItem } from '../triage/schemas.js';
import type { ScoreableItem } from '../triage/types.js';

/**
 * Result of priorities workflow execution.
 * Includes re-ranked priorities, delta information, and baseline status.
 */
export interface PrioritiesResult {
  priorities: BriefingItem[];
  baseline: {
    source: 'today' | 'bootstrap';
    timestamp: string;
    timeSince?: string;
  };
  delta?: {
    added: number;
    removed: number;
    changed: number;
    unchanged: number;
  };
  pins: {
    applied: number;
    total: number;
  };
  overrides: {
    applied: number;
    boosted: number;
    demoted: number;
  };
  warnings: string[];
}

/**
 * Check if two dates are the same day (UTC).
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

/**
 * Format time difference in human-readable format.
 *
 * @param timestamp - ISO timestamp to compare against current time
 * @returns Human-readable time difference (e.g., "3 hours ago")
 */
export function formatTimeSince(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  const diffMinutes = Math.floor(diffMs / 1000 / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

/**
 * Load today's morning briefing as baseline.
 * Returns undefined if missing or stale (from a previous day).
 *
 * @returns Morning briefing or undefined
 */
async function loadMorningBaseline(): Promise<Briefing | undefined> {
  const today = new Date();
  const briefing = await loadBriefing(today);

  if (!briefing) {
    console.log('[PrioritiesWorkflow] No briefing found for today');
    return undefined;
  }

  // Check if briefing is from today (stale check)
  const briefingDate = new Date(briefing.timestamp);
  if (!isSameDay(briefingDate, today)) {
    console.log('[PrioritiesWorkflow] Briefing is from a different day (stale)');
    return undefined;
  }

  console.log(`[PrioritiesWorkflow] Found today's briefing from ${formatTimeSince(briefing.timestamp)}`);
  return briefing;
}

/**
 * Execute the priorities workflow.
 *
 * Orchestrates:
 * 1. Load today's morning briefing as baseline
 * 2. If missing/stale: generate fresh baseline and persist (bootstrap)
 * 3. Load current ADO data
 * 4. Calculate delta between baseline and current
 * 5. Re-score items with ADO activity since morning
 * 6. Load and apply pins (pinned items first)
 * 7. Return re-ranked priorities
 *
 * Graceful degradation:
 * - Missing baseline triggers bootstrap (fresh generation)
 * - Failed ADO research returns error (can't generate priorities without data)
 * - Empty pins file returns unpinned list
 *
 * @returns Result with PrioritiesResult or Error
 */
export async function executePrioritiesWorkflow(): Promise<
  Result<PrioritiesResult, Error>
> {
  try {
    console.log('[PrioritiesWorkflow] Starting execution...');

    const warnings: string[] = [];

    // 1. Load config (fatal if missing)
    console.log('[PrioritiesWorkflow] Loading config...');
    const config = await loadOrPromptConfig();

    // 2. Initialize state directories
    console.log('[PrioritiesWorkflow] Initializing state directories...');
    await initializeStateDirs();

    // 3. Load today's morning briefing as baseline
    console.log('[PrioritiesWorkflow] Loading morning baseline...');
    let baseline = await loadMorningBaseline();
    let baselineSource: 'today' | 'bootstrap' = 'today';

    // 4. If baseline missing/stale, bootstrap fresh baseline
    if (!baseline) {
      console.log('[PrioritiesWorkflow] No valid baseline found - bootstrapping...');
      warnings.push('No morning baseline found - generated fresh priorities as bootstrap');
      baselineSource = 'bootstrap';

      // Execute researchers to generate fresh baseline
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
            `ADO researcher failed: ${results.ado.error.message}. Cannot generate priorities without ADO data.`
          )
        );
      }

      // Load overrides for bootstrap baseline
      const overrides = await loadOverrides();

      // Score items to create baseline
      const scorer = new PriorityScorer(config);
      const scoreableItems = extractScoreableItems(results);
      const scoredItems = scorer.scoreAllWithOverrides(scoreableItems, overrides);

      // Sort by score (highest first) and take top priorities
      const sorted = scoredItems.sort((a, b) => b.score - a.score);
      const topPriorities = sorted.slice(0, 5);

      // Convert to briefing items
      const baselineItems: BriefingItem[] = topPriorities.map((scored) => ({
        id: scored.item.item.id,
        type: scored.item.type,
        title: scored.item.item.title,
        priority_reason: formatScoreHint(scored.appliedRules) || 'default priority',
        needs_response: false,
      }));

      // Create bootstrap briefing
      baseline = {
        summary: 'Bootstrap priorities - generated from current data',
        top_priorities: baselineItems,
        needs_response: [],
        timestamp: new Date().toISOString(),
      };

      // Persist bootstrap baseline as today's briefing
      await persistBriefing(baseline);
      console.log('[PrioritiesWorkflow] Bootstrap baseline persisted');
    }

    // 5. Load current ADO data
    console.log('[PrioritiesWorkflow] Loading current ADO data...');
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
          `ADO researcher failed: ${results.ado.error.message}. Cannot generate priorities without ADO data.`
        )
      );
    }

    // 6. Calculate delta between baseline and current
    console.log('[PrioritiesWorkflow] Calculating delta...');
    const baselinePriorities = [
      ...baseline.top_priorities,
      ...baseline.needs_response,
    ];

    // Load overrides (should be same as bootstrap, but load again for consistency)
    const overrides = await loadOverrides();

    // Score current items with overrides
    const scorer = new PriorityScorer(config);
    const scoreableItems = extractScoreableItems(results);
    const scoredItems = scorer.scoreAllWithOverrides(scoreableItems, overrides);

    // Sort by score and take top items
    const sorted = scoredItems.sort((a, b) => b.score - a.score);
    const topCurrent = sorted.slice(0, 5);

    // Convert to briefing items
    const currentItems: BriefingItem[] = topCurrent.map((scored) => ({
      id: scored.item.item.id,
      type: scored.item.type,
      title: scored.item.item.title,
      priority_reason: formatScoreHint(scored.appliedRules) || 'default priority',
      needs_response: false,
    }));

    const delta = calculateDelta(baselinePriorities, currentItems);
    console.log(
      `[PrioritiesWorkflow] Delta: ${delta.added.length} added, ${delta.removed.length} removed, ${delta.changed.length} changed, ${delta.unchanged.length} unchanged`
    );

    // 7. Build final priority list: unchanged items keep baseline scores,
    // changed/added items use current scores
    const finalPriorities: BriefingItem[] = [];

    // Add unchanged items (keep baseline priority_reason)
    for (const change of delta.unchanged) {
      const baselineItem = baselinePriorities.find(
        (item) => item.id === change.id && item.type === change.type
      );
      if (baselineItem) {
        finalPriorities.push(baselineItem);
      }
    }

    // Add changed items (use current priority_reason)
    for (const change of delta.changed) {
      const currentItem = currentItems.find(
        (item) => item.id === change.id && item.type === change.type
      );
      if (currentItem) {
        finalPriorities.push(currentItem);
      }
    }

    // Add new items (use current priority_reason)
    for (const change of delta.added) {
      const currentItem = currentItems.find(
        (item) => item.id === change.id && item.type === change.type
      );
      if (currentItem) {
        finalPriorities.push(currentItem);
      }
    }

    // 8. Load and apply pins
    console.log('[PrioritiesWorkflow] Applying pins...');
    const pins = await loadPins();
    const pinnedPriorities = await applyPins(finalPriorities);
    const pinnedCount = finalPriorities.filter((item) =>
      pins.some((pin) => pin.id === item.id && pin.type === item.type)
    ).length;
    console.log(`[PrioritiesWorkflow] Applied ${pinnedCount} pins out of ${pins.length} total`);

    console.log('[PrioritiesWorkflow] Workflow complete!');

    return ok({
      priorities: pinnedPriorities,
      baseline: {
        source: baselineSource,
        timestamp: baseline.timestamp,
        timeSince: formatTimeSince(baseline.timestamp),
      },
      delta: {
        added: delta.added.length,
        removed: delta.removed.length,
        changed: delta.changed.length,
        unchanged: delta.unchanged.length,
      },
      pins: {
        applied: pinnedCount,
        total: pins.length,
      },
      overrides: {
        applied: overrides.length,
        boosted: overrides.filter(o => o.amount > 0).length,
        demoted: overrides.filter(o => o.amount < 0).length,
      },
      warnings,
    });
  } catch (error) {
    if (error instanceof Error) {
      return err(error);
    }
    return err(new Error(`Unknown error in priorities workflow: ${error}`));
  }
}

/**
 * Convert research results to scoreable items.
 * Compresses work items and pull requests from ADO researcher.
 *
 * @param results - Research results from orchestrator
 * @returns Array of scoreable items
 */
function extractScoreableItems(results: any): ScoreableItem[] {
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
