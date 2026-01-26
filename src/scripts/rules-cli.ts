#!/usr/bin/env node
/**
 * CLI entry point for /ops:rules skill.
 *
 * Displays current scoring rules in grouped table format.
 * With --edit flag, opens interactive editor.
 */

import { loadOrPromptConfig } from '../config/loader.js';
import { formatRulesTable } from '../formatters/rules-table.js';

async function main() {
  const args = process.argv.slice(2);
  const editMode = args.includes('--edit');

  console.error('[ops:rules] Loading configuration...\n');

  const config = await loadOrPromptConfig();

  if (editMode) {
    // Interactive editing will be added in Plan 11-03
    console.error('Interactive editing not yet implemented. Showing current rules.\n');
  }

  // Display current rules
  const rulesTable = formatRulesTable(config.priorities);
  console.log(rulesTable);

  console.error('\n[ops:rules] Rules display complete.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
