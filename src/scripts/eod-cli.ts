#!/usr/bin/env node
/**
 * CLI entry point for /ops:eod skill.
 *
 * Orchestrates the EOD workflow and outputs structured XML
 * for Claude Code to format as a personal journal-style daily wrap-up.
 *
 * Shows:
 * - Accomplishments (completed, progressed, GSD progress)
 * - Blockers with age (Blocked for N days)
 * - Carryover items with reasons and suggested priorities
 */

import { executeEODWorkflow } from '../integration/eod-workflow.js';

async function main() {
  console.error('[ops:eod] Generating end-of-day summary...\n');

  const result = await executeEODWorkflow();

  if (result.isErr()) {
    console.error('Error:', result.error.message);
    process.exit(1);
  }

  const { summary, tier, warnings } = result.value;

  // Output warnings to stderr so they don't interfere with XML data
  if (warnings.length > 0) {
    console.error('Warnings:');
    warnings.forEach((w) => console.error(`  - ${w}`));
    console.error('');
  }

  console.error(`[ops:eod] Degradation tier: ${tier}\n`);

  // Output the data as XML for Claude Code to process
  console.log('<eod-data>');
  console.log(`  <date>${summary.date}</date>`);
  console.log(`  <timestamp>${summary.timestamp}</timestamp>`);
  if (summary.morningBriefingTimestamp) {
    console.log(`  <morning-timestamp>${summary.morningBriefingTimestamp}</morning-timestamp>`);
  }
  console.log(`  <tier>${tier}</tier>`);

  // Accomplishments section
  console.log('  <accomplishments>');

  // Completed items
  console.log('    <completed>');
  for (const item of summary.accomplishments.completed) {
    console.log('      <item>');
    console.log(`        <id>${item.id}</id>`);
    console.log(`        <type>${item.type}</type>`);
    console.log(`        <title>${escapeXml(item.title)}</title>`);
    console.log('      </item>');
  }
  console.log('    </completed>');

  // Progressed items
  console.log('    <progressed>');
  for (const item of summary.accomplishments.progressed) {
    console.log('      <item>');
    console.log(`        <id>${item.id}</id>`);
    console.log(`        <type>${item.type}</type>`);
    console.log(`        <title>${escapeXml(item.title)}</title>`);
    console.log(`        <reason>${escapeXml(item.priority_reason)}</reason>`);
    console.log('      </item>');
  }
  console.log('    </progressed>');

  // GSD progress
  console.log('    <gsd-progress>');
  for (const progress of summary.accomplishments.gsdProgress) {
    console.log('      <project>');
    console.log(`        <name>${escapeXml(progress.projectName)}</name>`);
    console.log(`        <progress-delta>${progress.progressDelta}</progress-delta>`);
    console.log(`        <phases-completed>${progress.newPhasesCompleted}</phases-completed>`);
    if (progress.currentPhase) {
      console.log(`        <current-phase>${escapeXml(progress.currentPhase)}</current-phase>`);
    }
    console.log('      </project>');
  }
  console.log('    </gsd-progress>');

  console.log('  </accomplishments>');

  // Blockers section
  console.log('  <blockers>');
  for (const blocker of summary.blockers) {
    console.log('    <blocker>');
    console.log('      <item>');
    console.log(`        <id>${blocker.item.id}</id>`);
    console.log(`        <type>${blocker.item.type}</type>`);
    console.log(`        <title>${escapeXml(blocker.item.title)}</title>`);
    console.log(`        <reason>${escapeXml(blocker.item.priority_reason)}</reason>`);
    console.log('      </item>');
    console.log(`      <blocked-since>${blocker.blockedSince}</blocked-since>`);
    console.log(`      <days-blocked>${blocker.daysBlocked}</days-blocked>`);
    console.log(`      <suggested-action>${escapeXml(blocker.suggestedAction)}</suggested-action>`);
    if (blocker.previousReason) {
      console.log(`      <previous-reason>${escapeXml(blocker.previousReason)}</previous-reason>`);
    }
    console.log('    </blocker>');
  }
  console.log('  </blockers>');

  // Carryover section
  console.log('  <carryover>');
  for (const item of summary.carryover) {
    console.log('    <item>');
    console.log('      <task>');
    console.log(`        <id>${item.item.id}</id>`);
    console.log(`        <type>${item.item.type}</type>`);
    console.log(`        <title>${escapeXml(item.item.title)}</title>`);
    console.log('      </task>');
    console.log(`      <reason>${item.reason}</reason>`);
    console.log(`      <evidence>${escapeXml(item.evidence)}</evidence>`);
    console.log(`      <suggested-priority>${item.suggestedPriority}</suggested-priority>`);
    console.log('    </item>');
  }
  console.log('  </carryover>');

  console.log('</eod-data>');

  console.error('\n[ops:eod] EOD summary generation complete.');
}

/**
 * Escape special XML characters.
 * Order matters: ampersand first to avoid double-escaping.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
