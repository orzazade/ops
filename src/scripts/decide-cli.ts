#!/usr/bin/env node
/**
 * CLI entry point for /ops:decide skill.
 *
 * Generates personalized work recommendation based on priority scores and time context.
 * Outputs XML data for Claude Code skill to format and present.
 *
 * Usage: npx tsx src/scripts/decide-cli.ts
 *
 * Exit codes:
 * - 0: Success
 * - 1: Fatal error (config missing, ADO auth failed)
 */

import { executeDecisionWorkflow } from '../integration/decision-workflow.js';
import { formatDecisionResult } from '../formatters/recommendation.js';

async function main() {
  console.error('[ops:decide] Analyzing priorities and time context...\n');

  const result = await executeDecisionWorkflow();

  if (result.isErr()) {
    console.error(`\nError: ${result.error.message}`);
    process.exit(1);
  }

  const { decision, timeContext, itemsEvaluated, warnings } = result.value;

  // Output warnings to stderr
  if (warnings.length > 0) {
    console.error('\nWarnings:');
    warnings.forEach(w => console.error(`  - ${w}`));
  }

  // Output metadata to stderr
  console.error(`\n[ops:decide] Time context: ${timeContext.mode} (${timeContext.reasoning})`);
  console.error(`[ops:decide] Items evaluated: ${itemsEvaluated}`);

  // Output XML to stdout for skill processing
  console.log(formatDecisionResult(decision));

  console.error('\n[ops:decide] Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
