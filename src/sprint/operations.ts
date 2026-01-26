/**
 * Sprint move operations.
 * Handles moving work items between sprints via ADO API.
 */

import { ADOClient } from '../azure/client.js';
import type { SprintItem, DistributionResult } from './types.js';

export interface MoveResult {
  success: number;
  failed: number;
  errors: Array<{ itemId: number; error: string }>;
}

/**
 * Move selected items to a target sprint.
 * Executes moves sequentially (ADO API rate limits).
 *
 * @param client - ADO client instance
 * @param itemIds - Work item IDs to move
 * @param targetIterationPath - Full iteration path (e.g., "Project\\Sprint 215")
 * @param onProgress - Optional callback for progress updates
 */
export async function moveItemsToSprint(
  client: ADOClient,
  itemIds: number[],
  targetIterationPath: string,
  onProgress?: (moved: number, total: number, currentItem: number) => void
): Promise<MoveResult> {
  const result: MoveResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < itemIds.length; i++) {
    const itemId = itemIds[i];

    if (onProgress) {
      onProgress(i, itemIds.length, itemId);
    }

    try {
      await client.updateWorkItem(itemId, targetIterationPath);
      result.success++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        itemId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

/**
 * Execute a distribution plan, moving items to their assigned sprints.
 *
 * @param client - ADO client instance
 * @param distribution - Distribution result from capacity.distributeItems
 * @param onProgress - Optional callback for progress updates
 */
export async function executeDistribution(
  client: ADOClient,
  distribution: DistributionResult,
  onProgress?: (moved: number, total: number, currentItem: number) => void
): Promise<MoveResult> {
  const allItems = Array.from(distribution.assignments.entries());
  const result: MoveResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < allItems.length; i++) {
    const [itemId, iterationPath] = allItems[i];

    if (onProgress) {
      onProgress(i, allItems.length, itemId);
    }

    try {
      await client.updateWorkItem(itemId, iterationPath);
      result.success++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        itemId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}
