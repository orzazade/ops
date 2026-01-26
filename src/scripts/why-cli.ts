#!/usr/bin/env node
/**
 * CLI entry point for /ops:why skill.
 *
 * Shows score breakdown for a specific item.
 * Usage: why-cli.ts <id> [--type=work_item|pull_request]
 */

import { loadOrPromptConfig } from '../config/loader.js';
import { initializeStateDirs } from '../state/init.js';
import { PriorityScorer } from '../triage/scorer.js';
import { loadOverrides, applyOverrides } from '../triage/overrides.js';
import { ResearchOrchestrator } from '../researchers/orchestrator.js';
import { ADOResearcher } from '../researchers/ado-researcher.js';
import { GSDResearcher } from '../researchers/gsd-researcher.js';
import { compressWorkItem, compressPR } from '../context/compression.js';
import { explainScore } from '../formatters/score-explainer.js';
import type { ScoreableItem, ScoredItem } from '../triage/types.js';

async function main() {
  const args = process.argv.slice(2);
  const idArg = args.find(arg => !arg.startsWith('--'));
  const typeArg = args.find(arg => arg.startsWith('--type='));

  if (!idArg) {
    console.error('Usage: why-cli.ts <id> [--type=work_item|pull_request]');
    console.error('Example: why-cli.ts 12345');
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

  console.error(`[ops:why] Looking up ${itemType} #${id}...\n`);

  // Load config
  const config = await loadOrPromptConfig();
  await initializeStateDirs();

  // Get PAT
  const pat = process.env.AZURE_DEVOPS_PAT;
  if (!pat) {
    console.error('Error: AZURE_DEVOPS_PAT environment variable not set');
    process.exit(1);
  }

  // Fetch current data
  const adoResearcher = new ADOResearcher({
    ...config.azure,
    team: config.user?.team,
    pat,
  });
  const gsdResearcher = new GSDResearcher();
  const orchestrator = new ResearchOrchestrator(adoResearcher, gsdResearcher);
  const results = await orchestrator.execute();

  if (results.ado.isErr()) {
    console.error(`Error: ${results.ado.error.message}`);
    process.exit(1);
  }

  // Extract and score all items
  const items: ScoreableItem[] = [];
  const { workItems, pullRequests } = results.ado.value.data;

  for (const wi of workItems) {
    items.push({ type: 'work_item', item: compressWorkItem(wi) });
  }
  for (const pr of pullRequests) {
    items.push({ type: 'pull_request', item: compressPR(pr) });
  }

  // Find the target item
  const targetItem = items.find(
    item => item.item.id === id && item.type === itemType
  );

  if (!targetItem) {
    console.error(`Error: ${itemType} #${id} not found`);
    console.error('Run /ops:priorities to see available items');
    process.exit(1);
  }

  // Score all items and apply overrides
  const scorer = new PriorityScorer(config);
  const scored = items.map(item => scorer.score(item));
  const overrides = await loadOverrides();
  const withOverrides = applyOverrides(scored, overrides);
  const sorted = withOverrides.sort((a, b) => b.score - a.score);

  // Find scored target
  const scoredTarget = sorted.find(
    s => s.item.item.id === id && s.item.type === itemType
  );

  if (!scoredTarget) {
    console.error('Error: Failed to score target item');
    process.exit(1);
  }

  // Output explanation
  console.log(`# Score Breakdown: ${scoredTarget.item.item.title}`);
  console.log('');
  console.log(explainScore(scoredTarget, sorted));

  // Show if boosted/demoted
  const override = overrides.find(o => o.id === id && o.type === itemType);
  if (override) {
    const action = override.amount > 0 ? 'Boosted' : 'Demoted';
    console.log('');
    console.log(`**${action}** by ${Math.abs(override.amount)} points (expires at midnight)`);
  }

  console.error('\n[ops:why] Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
