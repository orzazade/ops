#!/usr/bin/env node
/**
 * CLI entry point for /ops:boost skill.
 *
 * Temporarily boosts an item's priority score.
 * Usage: boost-cli.ts <id> [--type=work_item|pull_request] [--amount=10]
 */

import { saveOverride, getOverride, getMidnightExpiry } from '../triage/overrides.js';
import { loadOrPromptConfig } from '../config/loader.js';
import { initializeStateDirs } from '../state/init.js';

const DEFAULT_BOOST_AMOUNT = 10;

async function main() {
  const args = process.argv.slice(2);
  const idArg = args.find(arg => !arg.startsWith('--'));
  const typeArg = args.find(arg => arg.startsWith('--type='));
  const amountArg = args.find(arg => arg.startsWith('--amount='));

  if (!idArg) {
    console.error('Usage: boost-cli.ts <id> [--type=work_item|pull_request] [--amount=10]');
    console.error('Example: boost-cli.ts 12345');
    process.exit(1);
  }

  const id = parseInt(idArg, 10);
  if (isNaN(id) || id <= 0) {
    console.error('Error: ID must be a positive integer');
    process.exit(1);
  }

  const itemType: 'work_item' | 'pull_request' = typeArg
    ? (typeArg.split('=')[1] as 'work_item' | 'pull_request')
    : 'work_item';

  const amount = amountArg ? parseInt(amountArg.split('=')[1], 10) : DEFAULT_BOOST_AMOUNT;
  if (isNaN(amount) || amount <= 0) {
    console.error('Error: Amount must be a positive integer');
    process.exit(1);
  }

  console.error(`[ops:boost] Boosting ${itemType} #${id} by ${amount} points...\n`);

  // Initialize
  await loadOrPromptConfig();
  await initializeStateDirs();

  // Check for existing override
  const existing = await getOverride(id, itemType);
  if (existing) {
    const action = existing.amount > 0 ? 'boost' : 'demote';
    console.error(`Note: Replacing existing ${action} of ${Math.abs(existing.amount)} points\n`);
  }

  // Save boost
  const result = await saveOverride(id, itemType, amount);

  if (result.isErr()) {
    console.error(`Error: ${result.error.message}`);
    process.exit(1);
  }

  console.log(`Boosted ${itemType} #${id} by +${amount} points`);
  console.log(`Expires: midnight (${getMidnightExpiry().split('T')[0]})`);
  console.log('');
  console.log('Run /ops:priorities to see the updated ranking.');

  console.error('\n[ops:boost] Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
