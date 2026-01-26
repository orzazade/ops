#!/usr/bin/env node
/**
 * CLI entry point for /ops:morning skill.
 *
 * Gathers and scores data from Azure DevOps and GSD projects,
 * then outputs structured data for Claude Code to generate the briefing.
 *
 * This avoids requiring a separate Anthropic API key since Claude Code
 * subscription users already have access to Claude through the skill.
 */

import { gatherMorningData, persistBriefing } from '../integration/index.js';
import type { Briefing } from '../triage/schemas.js';

async function main() {
  console.error('[ops:morning] Gathering work data...\n');

  const result = await gatherMorningData();

  if (result.isErr()) {
    console.error('Error:', result.error.message);
    process.exit(1);
  }

  const { context, scoredItems, tier, warnings, yesterday } = result.value;

  // Output warnings to stderr so they don't interfere with data
  if (warnings.length > 0) {
    console.error('Warnings:');
    warnings.forEach(w => console.error(`  - ${w}`));
    console.error('');
  }

  console.error(`[ops:morning] Data quality: Tier ${tier}/5`);
  console.error(`[ops:morning] Scored ${scoredItems.length} items\n`);

  // Output the data as XML for Claude Code to process
  console.log('<morning-data>');
  console.log(`  <tier>${tier}</tier>`);
  console.log(`  <timestamp>${new Date().toISOString()}</timestamp>`);

  if (yesterday) {
    console.log('  <yesterday>');
    console.log(`    <summary>${escapeXml(yesterday.summary)}</summary>`);
    console.log(`    <priority-count>${yesterday.top_priorities.length}</priority-count>`);
    console.log('  </yesterday>');
  }

  console.log('  <scored-items>');
  for (const item of scoredItems) {
    console.log(`    <item type="${item.type}" id="${item.id}" score="${item.score}">`);
    console.log(`      <title>${escapeXml(item.title)}</title>`);
    if (item.priority) console.log(`      <priority>${item.priority}</priority>`);
    if (item.state) console.log(`      <state>${escapeXml(item.state)}</state>`);
    if (item.assignedTo) console.log(`      <assigned-to>${escapeXml(item.assignedTo)}</assigned-to>`);
    console.log(`      <rules>${item.appliedRules.join(', ')}</rules>`);
    console.log('    </item>');
  }
  console.log('  </scored-items>');

  console.log('  <context>');
  console.log(context);
  console.log('  </context>');

  console.log('</morning-data>');

  console.error('\n[ops:morning] Data output complete. Claude will now generate your briefing.');
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
