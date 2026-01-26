#!/usr/bin/env npx tsx
/**
 * Sprint CLI - Interactive TUI for sprint capacity management
 *
 * Features:
 * - Display current sprint capacity with progress bar
 * - Show deferral suggestions if over-committed
 * - Interactive checkbox selection for work items
 * - Choose destination sprint or intelligent distribution
 * - Execute moves with progress feedback
 *
 * Usage:
 *   npx tsx src/scripts/sprint-cli.ts
 */

import { checkbox, select, confirm } from '@inquirer/prompts';
import { ADOClient } from '../azure/client.js';
import { loadOrPromptConfig } from '../config/loader.js';
import { executeSprintWorkflow } from '../sprint/workflow.js';
import {
  formatSprintChoices,
  formatCapacityHeader,
  formatDeferralSuggestions,
} from '../sprint/display.js';
import { moveItemsToSprint } from '../sprint/operations.js';
import type { SprintItem, FutureSprint } from '../sprint/types.js';
import { SingleBar, Presets } from 'cli-progress';

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  try {
    console.log('\n🚀 Sprint Intelligence - Interactive Sprint Management\n');

    // 1. Execute workflow to get sprint data
    console.log('Loading sprint data...\n');
    const workflowResult = await executeSprintWorkflow();

    if (workflowResult.isErr()) {
      console.error('❌ Error:', workflowResult.error.message);
      process.exit(1);
    }

    const { sprint, analysis, items } = workflowResult.value;

    // 2. Display capacity header
    console.log(formatCapacityHeader(sprint.name, analysis));

    // 3. Show deferral suggestions if over-committed
    if (analysis.isOverCommitted && analysis.suggestions.length > 0) {
      console.log(formatDeferralSuggestions(analysis.suggestions));
      console.log('');
    }

    // 4. Interactive checkbox for item selection
    if (items.length === 0) {
      console.log('No work items found in current sprint.');
      return;
    }

    const choices = formatSprintChoices(items);
    const selectedIds = await checkbox({
      message: 'Select items to move (Space to toggle, Enter to confirm)',
      choices,
      pageSize: 15,
    });

    if (selectedIds.length === 0) {
      console.log('\nNo items selected. Exiting.');
      return;
    }

    // Calculate selected items total
    const selectedItems = items.filter(i => selectedIds.includes(i.id));
    const totalPoints = selectedItems.reduce((sum, item) => sum + item.storyPoints, 0);
    console.log(`\n✓ Selected ${selectedIds.length} items (${totalPoints} points)`);

    // 5. Choose destination: specific sprint or intelligent distribution
    const destinationChoice = await select({
      message: 'How would you like to move these items?',
      choices: [
        { name: 'Choose a specific sprint', value: 'specific' },
        { name: 'Intelligent distribution (auto-balance)', value: 'distribute' },
      ],
    });

    let targetIterationPath: string | null = null;

    if (destinationChoice === 'specific') {
      // Fetch future sprints
      const config = await loadOrPromptConfig();
      const pat = process.env.AZURE_DEVOPS_PAT;
      if (!pat) {
        console.error('❌ AZURE_DEVOPS_PAT not set');
        process.exit(1);
      }

      const adoClient = new ADOClient({
        organization: config.azure.organization,
        project: config.azure.default_project || '',
        team: config.user?.team,
        pat,
      });

      console.log('\nFetching available sprints...');
      const futureIterations = await adoClient.getFutureIterations();

      if (futureIterations.length === 0) {
        console.log('❌ No future sprints available');
        return;
      }

      // Build sprint choices
      const sprintChoices = futureIterations.map(iter => ({
        name: `${iter.name} (${iter.path})`,
        value: iter.path || '',
      }));

      targetIterationPath = await select({
        message: 'Select destination sprint:',
        choices: sprintChoices,
      });
    } else {
      console.log('\n🤖 Intelligent distribution not yet implemented in this phase.');
      console.log('   (Will be added in future enhancement)');
      return;
    }

    // 6. Confirmation before executing moves
    const confirmed = await confirm({
      message: `Move ${selectedIds.length} items to ${targetIterationPath}?`,
      default: false,
    });

    if (!confirmed) {
      console.log('\n❌ Move cancelled.');
      return;
    }

    // 7. Execute moves with progress bar
    console.log('\n📦 Moving items...\n');

    const config = await loadOrPromptConfig();
    const pat = process.env.AZURE_DEVOPS_PAT;
    if (!pat) {
      console.error('❌ AZURE_DEVOPS_PAT not set');
      process.exit(1);
    }

    const adoClient = new ADOClient({
      organization: config.azure.organization,
      project: config.azure.default_project || '',
      team: config.user?.team,
      pat,
    });

    // Create progress bar
    const progressBar = new SingleBar(
      {
        format: 'Moving |{bar}| {percentage}% | {value}/{total} items | Current: #{current}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
      },
      Presets.shades_classic
    );

    progressBar.start(selectedIds.length, 0, { current: 0 });

    const moveResult = await moveItemsToSprint(
      adoClient,
      selectedIds,
      targetIterationPath!,
      (moved, total, currentItem) => {
        progressBar.update(moved, { current: currentItem });
      }
    );

    progressBar.update(selectedIds.length, { current: 'done' });
    progressBar.stop();

    // 8. Show results
    console.log(`\n✅ Successfully moved: ${moveResult.success} items`);
    if (moveResult.failed > 0) {
      console.log(`❌ Failed: ${moveResult.failed} items\n`);
      for (const error of moveResult.errors) {
        console.log(`   #${error.itemId}: ${error.error}`);
      }
    }

    console.log('\n✨ Sprint management complete!\n');
  } catch (error) {
    console.error('\n❌ Unexpected error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run CLI
main();
