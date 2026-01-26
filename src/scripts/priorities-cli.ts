#!/usr/bin/env node
/**
 * CLI entry point for /ops:priorities skill.
 *
 * Orchestrates the priorities re-ranking workflow and outputs structured XML
 * for Claude Code to format with visual markers (NEW, DONE, arrows).
 *
 * Supports:
 * - --pin <id>: Pin a work item or PR to keep it at the top
 * - --unpin <id>: Unpin a previously pinned item
 * - --type <work_item|pull_request>: Specify item type for pin/unpin (default: work_item)
 */

import { executePrioritiesWorkflow } from '../integration/priorities-workflow.js';
import { pinItem, unpinItem } from '../integration/pin-storage.js';
import type { BriefingItem } from '../triage/schemas.js';

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const pinArg = args.find(arg => arg.startsWith('--pin='));
  const unpinArg = args.find(arg => arg.startsWith('--unpin='));
  const typeArg = args.find(arg => arg.startsWith('--type='));

  // Default type to work_item
  const itemType: 'work_item' | 'pull_request' = typeArg
    ? (typeArg.split('=')[1] as 'work_item' | 'pull_request')
    : 'work_item';

  // Validate item type
  if (itemType !== 'work_item' && itemType !== 'pull_request') {
    console.error('Error: --type must be either "work_item" or "pull_request"');
    console.error('Usage: priorities-cli.ts [--pin=<id>] [--unpin=<id>] [--type=<type>]');
    process.exit(1);
  }

  // Handle pin operation
  if (pinArg) {
    const idStr = pinArg.split('=')[1];
    const id = parseInt(idStr, 10);

    if (isNaN(id) || id <= 0) {
      console.error('Error: --pin requires a valid positive integer ID');
      console.error('Usage: priorities-cli.ts --pin=<id> [--type=<type>]');
      process.exit(1);
    }

    console.error(`[ops:priorities] Pinning ${itemType} ${id}...\n`);

    // Execute workflow to get current priorities and find the item
    const result = await executePrioritiesWorkflow();

    if (result.isErr()) {
      console.error('Error:', result.error.message);
      process.exit(1);
    }

    const { priorities } = result.value;
    const itemToPin = priorities.find(
      item => item.id === id && item.type === itemType
    );

    if (!itemToPin) {
      console.error(`Error: ${itemType} ${id} not found in current priorities`);
      console.error('Run /ops:priorities to see available items');
      process.exit(1);
    }

    await pinItem(itemToPin);
    console.error(`[ops:priorities] Pinned ${itemType} ${id}: ${itemToPin.title}\n`);
    process.exit(0);
  }

  // Handle unpin operation
  if (unpinArg) {
    const idStr = unpinArg.split('=')[1];
    const id = parseInt(idStr, 10);

    if (isNaN(id) || id <= 0) {
      console.error('Error: --unpin requires a valid positive integer ID');
      console.error('Usage: priorities-cli.ts --unpin=<id> [--type=<type>]');
      process.exit(1);
    }

    console.error(`[ops:priorities] Unpinning ${itemType} ${id}...\n`);
    await unpinItem(id, itemType);
    console.error(`[ops:priorities] Unpinned ${itemType} ${id}\n`);
    process.exit(0);
  }

  // No pin/unpin operation - execute priorities workflow
  console.error('[ops:priorities] Generating priority re-ranking...\n');

  const result = await executePrioritiesWorkflow();

  if (result.isErr()) {
    console.error('Error:', result.error.message);
    process.exit(1);
  }

  const { priorities, baseline, delta, pins, warnings } = result.value;

  // Output warnings to stderr so they don't interfere with XML data
  if (warnings.length > 0) {
    console.error('Warnings:');
    warnings.forEach(w => console.error(`  - ${w}`));
    console.error('');
  }

  console.error(`[ops:priorities] Baseline: ${baseline.source} (${baseline.timeSince || 'just now'})\n`);

  // Output the data as XML for Claude Code to process
  console.log('<priorities-data>');
  console.log(`  <timestamp>${new Date().toISOString()}</timestamp>`);

  console.log('  <baseline>');
  console.log(`    <source>${baseline.source}</source>`);
  console.log(`    <timestamp>${baseline.timestamp}</timestamp>`);
  if (baseline.timeSince) {
    console.log(`    <time-since>${escapeXml(baseline.timeSince)}</time-since>`);
  }
  console.log('  </baseline>');

  if (delta) {
    console.log('  <delta>');
    console.log(`    <added>${delta.added}</added>`);
    console.log(`    <removed>${delta.removed}</removed>`);
    console.log(`    <changed>${delta.changed}</changed>`);
    console.log(`    <unchanged>${delta.unchanged}</unchanged>`);
    console.log('  </delta>');
  }

  console.log('  <pins>');
  console.log(`    <applied>${pins.applied}</applied>`);
  console.log(`    <total>${pins.total}</total>`);
  console.log('  </pins>');

  console.log('  <priorities>');
  for (const item of priorities) {
    console.log('    <item>');
    console.log(`      <id>${item.id}</id>`);
    console.log(`      <type>${item.type}</type>`);
    console.log(`      <title>${escapeXml(item.title)}</title>`);
    console.log(`      <reason>${escapeXml(item.priority_reason)}</reason>`);
    console.log('    </item>');
  }
  console.log('  </priorities>');

  console.log('</priorities-data>');

  console.error('\n[ops:priorities] Priority re-ranking complete.');
}

/**
 * Escape special XML characters.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
