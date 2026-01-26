#!/usr/bin/env node
/**
 * CLI entry point for /ops:morning skill.
 *
 * Invokes the morning workflow and outputs formatted briefing.
 * Designed to be called via `npx tsx src/scripts/morning-cli.ts`.
 */

import { executeMorningWorkflow } from '../integration/index.js';

async function main() {
  console.log('Starting morning briefing...\n');

  const result = await executeMorningWorkflow();

  if (result.isErr()) {
    console.error('Error:', result.error.message);
    process.exit(1);
  }

  const { briefing, tier, warnings, carryover } = result.value;

  // Show warnings if partial data
  if (warnings.length > 0) {
    console.log('Warnings:');
    warnings.forEach(w => console.log(`  - ${w}`));
    console.log('');
  }

  // Format and display briefing
  console.log('='.repeat(60));
  console.log('MORNING BRIEFING');
  console.log('='.repeat(60));
  console.log('');
  console.log('Summary:', briefing.summary);
  console.log('');

  console.log('Top Priorities:');
  briefing.top_priorities.forEach((item, i) => {
    console.log(`  ${i + 1}. [${item.type}] ${item.title}`);
    console.log(`     Reason: ${item.priority_reason}`);
    if (item.needs_response && item.suggested_response) {
      console.log(`     Suggested response: ${item.suggested_response}`);
    }
  });
  console.log('');

  if (briefing.needs_response.length > 0) {
    console.log('Needs Response:');
    briefing.needs_response.forEach((item, i) => {
      console.log(`  ${i + 1}. [${item.type}] ${item.title}`);
      if (item.suggested_response) {
        console.log(`     Suggested: ${item.suggested_response}`);
      }
    });
    console.log('');
  }

  if (briefing.blockers && briefing.blockers.length > 0) {
    console.log('Blockers:');
    briefing.blockers.forEach(b => console.log(`  - ${b}`));
    console.log('');
  }

  // Carryover info
  if (carryover) {
    console.log(`Carryover: ${carryover.count} items from yesterday, ${carryover.newCount} new`);
  }

  console.log('');
  console.log(`Generated: ${briefing.timestamp}`);
  console.log(`Data quality: Tier ${tier}/5`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
