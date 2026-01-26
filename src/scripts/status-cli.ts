#!/usr/bin/env node
/**
 * CLI entry point for /ops:status skill.
 *
 * Gathers and filters project-specific data from Azure DevOps and GSD projects,
 * then outputs structured XML for Claude Code to generate the status report.
 *
 * This avoids requiring a separate Anthropic API key since Claude Code
 * subscription users already have access to Claude through the skill.
 */

import { gatherProjectStatus } from '../integration/index.js';

async function main() {
  // Parse command line arguments
  const projectArg = process.argv.find(arg => arg.startsWith('--project='));

  if (!projectArg) {
    console.error('Usage: status-cli.ts --project=<name>');
    console.error('Example: status-cli.ts --project=CPQ');
    process.exit(1);
  }

  const projectName = projectArg.split('=')[1];

  if (!projectName) {
    console.error('Error: Project name cannot be empty');
    console.error('Usage: status-cli.ts --project=<name>');
    process.exit(1);
  }

  console.error(`[ops:status] Gathering data for project: ${projectName}\n`);

  const result = await gatherProjectStatus(projectName);

  if (result.isErr()) {
    console.error('Error:', result.error.message);
    process.exit(1);
  }

  const { context, projectName: project, filteredCounts, tier, warnings } = result.value;

  // Output warnings to stderr so they don't interfere with XML data
  if (warnings.length > 0) {
    console.error('Warnings:');
    warnings.forEach(w => console.error(`  - ${w}`));
    console.error('');
  }

  console.error(`[ops:status] Data quality: Tier ${tier}/4\n`);

  // Output the data as XML for Claude Code to process
  console.log('<status-data>');
  console.log(`  <project>${escapeXml(project)}</project>`);
  console.log(`  <tier>${tier}</tier>`);
  console.log(`  <timestamp>${new Date().toISOString()}</timestamp>`);

  console.log('  <counts>');
  console.log(`    <work-items>${filteredCounts.workItems}</work-items>`);
  console.log(`    <pull-requests>${filteredCounts.pullRequests}</pull-requests>`);
  console.log(`    <projects>${filteredCounts.projects}</projects>`);
  console.log('  </counts>');

  console.log('  <context>');
  console.log(context);
  console.log('  </context>');

  console.log('</status-data>');

  console.error('\n[ops:status] Data output complete.');
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
