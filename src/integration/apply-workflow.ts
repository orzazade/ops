/**
 * Apply workflow for updating work items with investigation findings.
 * Shows diff preview and prompts for confirmation before applying changes.
 */

import { Result, ok, err } from 'neverthrow';
import { confirm } from '@inquirer/prompts';
import { ADOClient } from '../azure/client.js';
import { DiffGenerator } from '../diff/generator.js';
import type { WorkItemUpdate } from '../investigators/types.js';

/**
 * Configuration for apply workflow.
 */
export interface ApplyWorkflowConfig {
  ticketId: number;
  project: string;
  organization: string;
  pat: string;
  updates: WorkItemUpdate;
}

/**
 * Workflow for applying investigation findings to work items.
 * Handles diff preview, user confirmation, and ADO API updates.
 */
export class ApplyWorkflow {
  constructor(private config: ApplyWorkflowConfig) {}

  /**
   * Show preview of proposed changes.
   * Fetches current work item and displays diff for all changes.
   */
  async showPreview(): Promise<void> {
    console.log('\n=== Proposed Work Item Updates ===\n');

    // Create ADO client
    const adoClient = new ADOClient({
      organization: this.config.organization,
      project: this.config.project,
      pat: this.config.pat,
    });

    // Fetch current work item
    const workItem = await adoClient.fetchWorkItemWithRelations(this.config.ticketId);

    // Generate and display diff
    const diffGenerator = new DiffGenerator();
    const diff = diffGenerator.generateWorkItemDiff(workItem, this.config.updates);

    console.log(diff);
    console.log();
  }

  /**
   * Confirm and apply changes to work item.
   * Shows preview, prompts user, and applies changes via ADO API if approved.
   *
   * @returns Result with void on success, Error on failure
   */
  async confirmAndApply(): Promise<Result<void, Error>> {
    try {
      // Show preview
      await this.showPreview();

      // Prompt for confirmation
      const shouldApply = await confirm({
        message: `Apply these changes to work item #${this.config.ticketId}?`,
        default: false,
      });

      if (!shouldApply) {
        console.log('Changes not applied.');
        return ok(undefined);
      }

      // Create ADO client
      const adoClient = new ADOClient({
        organization: this.config.organization,
        project: this.config.project,
        pat: this.config.pat,
      });

      // Build JSON Patch Document
      const patchDoc: any[] = [];

      // Add description update
      if (this.config.updates.description !== undefined) {
        patchDoc.push({
          op: 'add',
          path: '/fields/System.Description',
          value: this.config.updates.description,
        });
      }

      // Add acceptance criteria update
      if (this.config.updates.acceptanceCriteria !== undefined) {
        patchDoc.push({
          op: 'add',
          path: '/fields/Microsoft.VSTS.Common.AcceptanceCriteria',
          value: this.config.updates.acceptanceCriteria,
        });
      }

      // Add tags (merge with existing)
      if (this.config.updates.tags && this.config.updates.tags.length > 0) {
        // Fetch current work item to get existing tags
        const currentWorkItem = await adoClient.fetchWorkItemWithRelations(this.config.ticketId);
        const existingTags = currentWorkItem.tags || [];
        const newTags = [...new Set([...existingTags, ...this.config.updates.tags])];

        patchDoc.push({
          op: 'add',
          path: '/fields/System.Tags',
          value: newTags.join('; '),
        });
      }

      // Add links
      if (this.config.updates.links && this.config.updates.links.length > 0) {
        for (const link of this.config.updates.links) {
          patchDoc.push({
            op: 'add',
            path: '/relations/-',
            value: {
              rel: 'Hyperlink',
              url: link.url,
              attributes: {
                comment: link.comment,
              },
            },
          });
        }
      }

      // Apply updates via ADO API
      const witApi = await (adoClient as any).getWorkItemApi();

      await witApi.updateWorkItem(
        null,              // customHeaders
        patchDoc,
        this.config.ticketId,
        this.config.project,
        false,             // validateOnly
        false,             // bypassRules
        true               // suppressNotifications
      );

      console.log(`✓ Successfully updated work item #${this.config.ticketId}`);

      return ok(undefined);
    } catch (error) {
      if (error instanceof Error) {
        return err(error);
      }
      return err(new Error(`Unknown error in apply workflow: ${error}`));
    }
  }
}

/**
 * Execute apply workflow.
 * Main entry point for applying investigation findings.
 *
 * @param config - Apply workflow configuration
 * @returns Result with void on success, Error on failure
 */
export async function executeApply(
  config: ApplyWorkflowConfig
): Promise<Result<void, Error>> {
  const workflow = new ApplyWorkflow(config);
  return workflow.confirmAndApply();
}
