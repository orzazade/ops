/**
 * Status workflow orchestrator for project-specific data gathering.
 * Coordinates researchers and context engine for leadership status reports.
 */

import { Result, ok, err } from 'neverthrow';
import { loadOrPromptConfig } from '../config/loader.js';
import { initializeStateDirs } from '../state/init.js';
import { ResearchOrchestrator } from '../researchers/orchestrator.js';
import { ADOResearcher } from '../researchers/ado-researcher.js';
import { GSDResearcher } from '../researchers/gsd-researcher.js';
import { ContextEngine } from '../context/engine.js';
import { filterByProject } from './project-filter.js';
import type { ResearchResults } from '../researchers/orchestrator.js';
import type { ProjectFilter } from './project-filter.js';

/**
 * Result of status workflow execution.
 * Includes filtered context, data quality tier, and warnings.
 */
export interface StatusDataResult {
  /** XML context from ContextEngine (filtered to project) */
  context: string;
  /** Project name that was filtered */
  projectName: string;
  /** Counts of filtered items */
  filteredCounts: {
    workItems: number;
    pullRequests: number;
    projects: number;
  };
  /** Data quality tier (1=best: ADO+GSD, 4=worst: no data) */
  tier: number;
  /** Warnings about partial or missing data */
  warnings: string[];
}

/**
 * Determine status report data quality tier.
 *
 * Tier 1: ADO + GSD data available (best case)
 * Tier 2: ADO only (no GSD data)
 * Tier 3: GSD only (no ADO data)
 * Tier 4: No data for project (worst case)
 *
 * @param filtered - Filtered research results
 * @param hasGSD - Whether GSD data is available
 * @returns Data quality tier (1-4)
 */
export function determineStatusTier(
  filtered: ResearchResults,
  hasGSD: boolean
): number {
  const hasFilteredADO =
    filtered.ado.isOk() &&
    (filtered.ado.value.data.workItems.length > 0 ||
      filtered.ado.value.data.pullRequests.length > 0);
  const hasFilteredGSD = hasGSD && filtered.gsd.isOk() && filtered.gsd.value.data.projects.length > 0;

  if (hasFilteredADO && hasFilteredGSD) return 1;
  if (hasFilteredADO) return 2;
  if (hasFilteredGSD) return 3;
  return 4;
}

/**
 * Generate warnings based on filtered research results.
 *
 * @param filtered - Filtered research results
 * @param tier - Data quality tier
 * @returns Array of warning messages
 */
function generateStatusWarnings(filtered: ResearchResults, tier: number): string[] {
  const warnings: string[] = [];

  if (filtered.ado.isErr()) {
    warnings.push(
      `ADO researcher failed: ${filtered.ado.error.message}. Report will not include Azure DevOps data.`
    );
  } else if (filtered.ado.value.status === 'partial') {
    warnings.push(
      `ADO researcher returned partial data. Some work items or pull requests may be missing.`
    );
  } else if (
    filtered.ado.isOk() &&
    filtered.ado.value.data.workItems.length === 0 &&
    filtered.ado.value.data.pullRequests.length === 0
  ) {
    warnings.push(
      `No ADO items found for this project. Check project name spelling or sprint path configuration.`
    );
  }

  if (filtered.gsd.isErr()) {
    warnings.push(
      `GSD researcher failed: ${filtered.gsd.error.message}. Report will not include project planning data.`
    );
  } else if (filtered.gsd.value.status === 'partial') {
    warnings.push(
      `GSD researcher returned partial data. Some projects may be missing.`
    );
  } else if (filtered.gsd.isOk() && filtered.gsd.value.data.projects.length === 0) {
    warnings.push(
      `No GSD projects found for this project name. Check project name spelling.`
    );
  }

  if (tier === 4) {
    warnings.push(
      `No data found for project. Cannot generate status report.`
    );
  }

  return warnings;
}

/**
 * Count filtered items from research results.
 *
 * @param filtered - Filtered research results
 * @returns Counts object
 */
function countFilteredItems(filtered: ResearchResults): {
  workItems: number;
  pullRequests: number;
  projects: number;
} {
  return {
    workItems: filtered.ado.isOk() ? filtered.ado.value.data.workItems.length : 0,
    pullRequests: filtered.ado.isOk() ? filtered.ado.value.data.pullRequests.length : 0,
    projects: filtered.gsd.isOk() ? filtered.gsd.value.data.projects.length : 0,
  };
}

/**
 * Gather project status data for leadership reports.
 *
 * Orchestrates:
 * 1. Config loading
 * 2. State initialization
 * 3. Research execution (ADO + GSD in parallel)
 * 4. Project filtering
 * 5. Context building
 *
 * Does NOT:
 * - Call Anthropic API for report generation (CLI handles output)
 * - Persist history (not needed for status reports)
 * - Score items (not needed, report shows all filtered data)
 *
 * Graceful degradation:
 * - Partial researcher failures continue with available data
 * - Missing data sources logged as warnings
 * - All errors produce actionable error messages
 *
 * @param projectName - Project name to filter by
 * @returns Result with StatusDataResult or Error
 */
export async function gatherProjectStatus(
  projectName: string
): Promise<Result<StatusDataResult, Error>> {
  try {
    console.log(`[StatusWorkflow] Gathering status for project: ${projectName}`);

    // 1. Load config (fatal if missing)
    console.log('[StatusWorkflow] Loading config...');
    const config = await loadOrPromptConfig();

    // 2. Initialize state directories
    console.log('[StatusWorkflow] Initializing state directories...');
    await initializeStateDirs();

    // 3. Execute researchers in parallel
    console.log('[StatusWorkflow] Executing researchers...');

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

    // 4. Filter results by project
    console.log('[StatusWorkflow] Filtering results by project...');
    const filter: ProjectFilter = { projectName };
    const filtered = filterByProject(results, filter);

    // 5. Determine tier and generate warnings
    const hasGSD = results.gsd.isOk();
    const tier = determineStatusTier(filtered, hasGSD);
    const warnings = generateStatusWarnings(filtered, tier);
    const filteredCounts = countFilteredItems(filtered);

    console.log(
      `[StatusWorkflow] Data quality tier: ${tier}, filtered items: ${JSON.stringify(filteredCounts)}`
    );

    // Handle tier 4 (no data for project)
    if (tier === 4) {
      return ok({
        context:
          '<status-context><error>No data available for this project</error></status-context>',
        projectName,
        filteredCounts,
        tier,
        warnings,
      });
    }

    // 6. Build context with ContextEngine
    console.log('[StatusWorkflow] Building context...');
    const contextEngine = new ContextEngine({
      totalBudget: 4000,
    });

    const contextResult = await contextEngine.fromResearchResults(filtered);

    if (contextResult.isErr()) {
      return err(
        new Error(
          `Context building failed: ${contextResult.error.message}. Unable to gather status data.`
        )
      );
    }

    const context = contextResult.value;
    const stats = contextEngine.getStats();
    console.log(
      `[StatusWorkflow] Context built: ${stats.totalTokens} tokens, ${stats.sectionCount} sections`
    );

    console.log('[StatusWorkflow] Status data gathering complete!');

    return ok({
      context,
      projectName,
      filteredCounts,
      tier,
      warnings,
    });
  } catch (error) {
    if (error instanceof Error) {
      return err(error);
    }
    return err(new Error(`Unknown error gathering project status: ${error}`));
  }
}
