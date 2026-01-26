/**
 * Sprint workflow orchestrator.
 * Coordinates sprint data loading, capacity analysis, and suggestion generation.
 */

import { Result, ok, err } from 'neverthrow';
import { loadOrPromptConfig } from '../config/loader.js';
import { ADOClient } from '../azure/client.js';
import type { SprintItem, SprintState, LoadAnalysis } from './types.js';
import { analyzeLoad } from './capacity.js';

const DEFAULT_STORY_POINTS = 3;

/**
 * Result of sprint workflow execution.
 * Provides sprint state, capacity analysis, and current items for TUI display.
 */
export interface SprintWorkflowResult {
  sprint: SprintState;
  analysis: LoadAnalysis;
  items: SprintItem[];
}

/**
 * Execute the sprint workflow.
 *
 * Orchestrates:
 * 1. Load config (get capacity from config.sprint.capacity_points)
 * 2. Fetch current sprint items from ADO (user's items only)
 * 3. Analyze load and generate suggestions if over-committed
 * 4. Return data for TUI display
 *
 * @returns Result with SprintWorkflowResult or Error
 */
export async function executeSprintWorkflow(): Promise<
  Result<SprintWorkflowResult, Error>
> {
  try {
    console.log('[SprintWorkflow] Starting execution...');

    // 1. Load config
    console.log('[SprintWorkflow] Loading config...');
    const config = await loadOrPromptConfig();
    const capacityPoints = config.sprint.capacity_points;
    console.log(`[SprintWorkflow] Sprint capacity: ${capacityPoints} points`);

    // 2. Check for PAT
    const pat = process.env.AZURE_DEVOPS_PAT;
    if (!pat) {
      return err(
        new Error(
          'AZURE_DEVOPS_PAT environment variable not set. ' +
            'Set it to authenticate with Azure DevOps.'
        )
      );
    }

    // 3. Initialize ADO client
    const adoClient = new ADOClient({
      organization: config.azure.organization,
      project: config.azure.default_project || '',
      team: config.user?.team,
      pat,
    });

    // 4. Fetch current iteration
    console.log('[SprintWorkflow] Fetching current iteration...');
    const currentIteration = await adoClient.getCurrentIteration();
    if (!currentIteration) {
      return err(
        new Error(
          'Could not fetch current iteration. Ensure team is configured in ~/.ops/config.yaml'
        )
      );
    }

    console.log(`[SprintWorkflow] Current sprint: ${currentIteration.name}`);

    // 5. Fetch work items in current sprint (filtered by current sprint)
    console.log('[SprintWorkflow] Fetching sprint items...');
    const workItems = await adoClient.fetchWorkItems(true);
    console.log(`[SprintWorkflow] Found ${workItems.length} items`);

    // 6. Convert to SprintItem format
    const sprintItems: SprintItem[] = workItems.map(wi => {
      const fields = wi.fields || {};
      const createdDate = fields['System.CreatedDate']
        ? new Date(fields['System.CreatedDate'])
        : new Date();
      const now = new Date();
      const age = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: wi.id!,
        title: fields['System.Title'] || 'Untitled',
        type: fields['System.WorkItemType'] || 'Task',
        state: fields['System.State'] || 'New',
        priority: fields['Microsoft.VSTS.Common.Priority'] || null,
        storyPoints: fields['Microsoft.VSTS.Scheduling.StoryPoints'] || DEFAULT_STORY_POINTS,
        assignedTo: fields['System.AssignedTo']?.displayName || null,
        createdDate: createdDate.toISOString(),
        iterationPath: fields['System.IterationPath'] || '',
        tags: fields['System.Tags'] ? fields['System.Tags'].split(';').map((t: string) => t.trim()) : [],
        age,
      };
    });

    // 7. Calculate total used capacity
    const usedCapacity = sprintItems.reduce((sum, item) => sum + item.storyPoints, 0);

    // 8. Build sprint state
    const sprintState: SprintState = {
      name: currentIteration.name || 'Current Sprint',
      iterationPath: currentIteration.path || '',
      startDate: currentIteration.attributes?.startDate
        ? new Date(currentIteration.attributes.startDate).toISOString()
        : new Date().toISOString(),
      endDate: currentIteration.attributes?.finishDate
        ? new Date(currentIteration.attributes.finishDate).toISOString()
        : new Date().toISOString(),
      capacity: capacityPoints,
      used: usedCapacity,
      items: sprintItems,
      isOverCommitted: (usedCapacity / capacityPoints) > 1.2,
    };

    // 9. Analyze load (this will generate deferral suggestions if over-committed)
    console.log('[SprintWorkflow] Analyzing sprint load...');

    // Convert to format expected by analyzeLoad
    const itemsForAnalysis = sprintItems.map(item => ({
      id: String(item.id),
      title: item.title,
      priority: item.priority ? `P${item.priority}` as 'P1' | 'P2' | 'P3' : 'P3',
      storyPoints: item.storyPoints,
      createdDate: new Date(item.createdDate),
    }));

    const analysis = analyzeLoad(itemsForAnalysis, capacityPoints);

    // Convert suggestions back to include full SprintItem
    const suggestionsWithItems = analysis.suggestions.map(sug => {
      const item = sprintItems.find(i => String(i.id) === sug.itemId);
      return {
        item: item!,
        reason: sug.reason,
        targetSprint: '', // Will be filled in by TUI
      };
    });

    const loadAnalysis: LoadAnalysis = {
      ...analysis,
      suggestions: suggestionsWithItems,
    };

    console.log(`[SprintWorkflow] Capacity: ${analysis.currentCapacity}/${analysis.maxCapacity} (${analysis.utilizationPercent}%)`);
    if (analysis.isOverCommitted) {
      console.log(`[SprintWorkflow] OVER-COMMITTED: ${analysis.suggestions.length} deferral suggestions`);
    }

    console.log('[SprintWorkflow] Workflow complete!');

    return ok({
      sprint: sprintState,
      analysis: loadAnalysis,
      items: sprintItems,
    });
  } catch (error) {
    if (error instanceof Error) {
      return err(error);
    }
    return err(new Error(`Unknown error in sprint workflow: ${error}`));
  }
}
