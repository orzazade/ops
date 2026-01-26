#!/usr/bin/env node
/**
 * CLI entry point for /ops:research skill.
 *
 * Orchestrates ticket investigation workflow and outputs structured XML
 * for Claude Code to synthesize and format findings.
 *
 * Usage:
 * - research-cli.ts <ticket-id>: Execute investigation
 * - research-cli.ts <ticket-id> --apply: Apply suggested changes after investigation
 */

import { loadOrPromptConfig } from '../config/loader.js';
import { executeResearch } from '../integration/research-workflow.js';
import { executeApply } from '../integration/apply-workflow.js';
import { existsSync } from 'fs';
import { join } from 'path';
import { simpleGit } from 'simple-git';

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);

  // First positional arg is ticket ID
  const ticketIdStr = args.find(arg => !arg.startsWith('--'));
  if (!ticketIdStr) {
    console.error('Error: Ticket ID is required');
    console.error('Usage: research-cli.ts <ticket-id> [--apply]');
    process.exit(1);
  }

  const ticketId = parseInt(ticketIdStr, 10);
  if (isNaN(ticketId) || ticketId <= 0) {
    console.error('Error: Ticket ID must be a valid positive integer');
    console.error('Usage: research-cli.ts <ticket-id> [--apply]');
    process.exit(1);
  }

  // Check for --apply flag
  const shouldApply = args.includes('--apply');

  console.error(`[ops:research] Starting investigation for ticket #${ticketId}...\n`);

  // Load config
  const config = await loadOrPromptConfig();

  // Get PAT from environment
  const pat = process.env.AZURE_DEVOPS_PAT;
  if (!pat) {
    console.error('Error: AZURE_DEVOPS_PAT environment variable not set');
    console.error('Set it to authenticate with Azure DevOps');
    process.exit(1);
  }

  // Determine repo paths
  const repoPaths: string[] = [];

  // Check if current directory is a git repo
  try {
    const git = simpleGit(process.cwd());
    const isRepo = await git.checkIsRepo();
    if (isRepo) {
      repoPaths.push(process.cwd());
      console.error(`[ops:research] Found git repo in current directory\n`);
    }
  } catch {
    // Not a repo, continue
  }

  // Also check baseClonePath for existing repos
  const baseClonePath = '~/Projects/appxite';
  const expandedPath = baseClonePath.replace('~', process.env.HOME || '');
  if (existsSync(expandedPath)) {
    console.error(`[ops:research] Checking ${baseClonePath} for repos...\n`);
    // We'll let the workflow detect and clone as needed
  }

  // Execute research workflow
  const project = config.azure.default_project;
  if (!project) {
    console.error('Error: default_project not configured in ~/.ops/config.yaml');
    console.error('Run /ops:config to set up your Azure DevOps project');
    process.exit(1);
  }

  const researchResult = await executeResearch({
    ticketId,
    project,
    organization: config.azure.organization,
    pat,
    repoPaths,
    baseClonePath,
  });

  if (researchResult.isErr()) {
    console.error('Error:', researchResult.error.message);
    process.exit(1);
  }

  const { investigation, summary, workItem, reposCloned } = researchResult.value;

  // Output investigation results as XML for Claude to process
  console.log('<investigation>');

  // Ticket section (populated from workItem)
  console.log(`  <ticket id="${workItem.id}" title="${escapeXml(workItem.title)}">`);

  const hasDetailedDescription = investigation.tickets.isOk()
    ? investigation.tickets.value.hasDetailedDescription
    : workItem.description.length > 100;

  const hasAcceptanceCriteria = investigation.tickets.isOk()
    ? investigation.tickets.value.hasAcceptanceCriteria
    : workItem.acceptanceCriteria.length > 0;

  console.log(`    <description_quality>${hasDetailedDescription ? 'adequate' : 'needs-improvement'}</description_quality>`);
  console.log(`    <acceptance_criteria_quality>${hasAcceptanceCriteria ? 'present' : 'missing'}</acceptance_criteria_quality>`);
  console.log('  </ticket>');

  // Confidence
  console.log(`  <confidence>${summary.confidence}</confidence>`);

  // Related items
  console.log(`  <related_items count="${summary.relatedItems.length}">`);
  for (const item of summary.relatedItems) {
    console.log(`    <item id="${item.id}" type="${escapeXml(item.type)}" relevance="${escapeXml(item.relevance)}" />`);
  }
  console.log('  </related_items>');

  // Code search queries
  if (investigation.code.isOk()) {
    const codeData = investigation.code.value;
    console.log('  <code_search_queries>');
    for (const query of codeData.searchQueries) {
      console.log(`    <query pattern="${escapeXml(query.pattern)}" glob="${escapeXml(query.glob)}">${escapeXml(query.description)}</query>`);
    }
    console.log('  </code_search_queries>');
  }

  // Wiki search queries
  if (investigation.wiki.isOk()) {
    const wikiData = investigation.wiki.value;
    console.log('  <wiki_search_queries>');
    for (const query of wikiData.searchQueries) {
      const termsStr = query.terms.join(', ');
      console.log(`    <query terms="${escapeXml(termsStr)}">${escapeXml(query.description)}</query>`);
    }
    console.log('  </wiki_search_queries>');
  }

  // Missing info
  console.log('  <missing_info>');
  for (const info of summary.missingInfo) {
    console.log(`    <item>${escapeXml(info)}</item>`);
  }
  console.log('  </missing_info>');

  // Suggested changes (populated by skill based on investigation)
  console.log('  <suggested_changes>');
  console.log('    <!-- Populated by skill based on investigation -->');
  console.log('  </suggested_changes>');

  console.log('</investigation>');

  console.error(`\n[ops:research] Investigation complete with ${summary.confidence} confidence.`);
  console.error(`[ops:research] Related items: ${summary.relatedItems.length}`);
  console.error(`[ops:research] Missing info: ${summary.missingInfo.length}`);

  if (reposCloned.length > 0) {
    console.error(`[ops:research] Cloned repos: ${reposCloned.join(', ')}`);
  }

  // Handle --apply flag
  if (shouldApply) {
    if (summary.suggestedChanges.description || summary.suggestedChanges.acceptanceCriteria) {
      console.error('\n[ops:research] Applying suggested changes...\n');

      const applyResult = await executeApply({
        ticketId,
        project,
        organization: config.azure.organization,
        pat,
        updates: summary.suggestedChanges,
      });

      if (applyResult.isErr()) {
        console.error('Error applying changes:', applyResult.error.message);
        process.exit(1);
      }

      console.error('[ops:research] Changes applied successfully.');
    } else {
      console.error('\n[ops:research] No suggested changes to apply.');
    }
  }
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
