#!/usr/bin/env node
/**
 * CLI entry point for /ops:rules skill.
 *
 * Displays current scoring rules in grouped table format.
 * With --edit flag, opens interactive editor.
 */

import { select, input, confirm } from '@inquirer/prompts';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import writeFileAtomic from 'write-file-atomic';
import { loadOrPromptConfig } from '../config/loader.js';
import { formatRulesTable } from '../formatters/rules-table.js';
import type { OpsConfig } from '../config/schema.js';

const OPS_DIR = path.join(process.env.HOME || '', '.ops');
const RULES_FILE = path.join(OPS_DIR, 'rules.json');

// Human-readable rule names
const RULE_NAMES: Record<string, string> = {
  p1_priority: 'P1 priority',
  p2_priority: 'P2 priority',
  vip_involvement: 'VIP involvement',
  age_over_3_days: 'Age over 3 days',
  sprint_commitment: 'Sprint commitment',
  blocking_others: 'Blocking others',
  carried_over: 'Carried over',
};

// Default weights
const DEFAULT_WEIGHTS: Record<string, number> = {
  p1_priority: 2,
  p2_priority: 1,
  vip_involvement: 3,
  age_over_3_days: 2,
  sprint_commitment: 3,
  blocking_others: 2,
  carried_over: 1,
};

async function loadCustomRules(): Promise<Record<string, number> | null> {
  try {
    const content = await fs.readFile(RULES_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return parsed.priorities || null;
  } catch {
    return null;
  }
}

async function saveCustomRules(priorities: Record<string, number>): Promise<void> {
  await fs.mkdir(OPS_DIR, { recursive: true });
  await writeFileAtomic(
    RULES_FILE,
    JSON.stringify({ priorities, updated_at: new Date().toISOString() }, null, 2),
    { encoding: 'utf-8' }
  );
}

async function interactiveEditor(currentPriorities: OpsConfig['priorities']): Promise<void> {
  console.log('\n--- Interactive Rules Editor ---\n');

  while (true) {
    const action = await select({
      message: 'What would you like to do?',
      choices: [
        { name: 'Adjust weight for a rule', value: 'adjust' },
        { name: 'Reset to defaults', value: 'reset' },
        { name: 'Show current rules', value: 'show' },
        { name: 'Exit', value: 'exit' },
      ],
    });

    if (action === 'exit') {
      console.log('\nExiting editor.');
      break;
    }

    if (action === 'show') {
      console.log('\n' + formatRulesTable(currentPriorities));
      continue;
    }

    if (action === 'reset') {
      const confirmed = await confirm({
        message: 'Reset all weights to defaults?',
        default: false,
      });

      if (confirmed) {
        await saveCustomRules(DEFAULT_WEIGHTS);
        Object.assign(currentPriorities, DEFAULT_WEIGHTS);
        console.log('\n\u2713 Weights reset to defaults.\n');
      }
      continue;
    }

    // action === 'adjust'
    const ruleKey = await select({
      message: 'Which rule to adjust?',
      choices: Object.entries(currentPriorities).map(([key, value]) => ({
        name: `${RULE_NAMES[key] || key}: ${value}`,
        value: key,
      })),
    });

    const newWeight = await input({
      message: `New weight for ${RULE_NAMES[ruleKey] || ruleKey} (current: ${currentPriorities[ruleKey as keyof typeof currentPriorities]}):`,
      default: String(currentPriorities[ruleKey as keyof typeof currentPriorities]),
      validate: (value) => {
        const num = Number(value);
        if (isNaN(num)) return 'Must be a number';
        if (num < 0) return 'Must be non-negative';
        if (!Number.isInteger(num)) return 'Must be a whole number';
        return true;
      },
    });

    // Update in memory
    (currentPriorities as any)[ruleKey] = Number(newWeight);

    // Save to custom rules file
    await saveCustomRules(currentPriorities as unknown as Record<string, number>);
    console.log(`\n\u2713 Updated ${RULE_NAMES[ruleKey] || ruleKey} to ${newWeight}.\n`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const editMode = args.includes('--edit');

  console.error('[ops:rules] Loading configuration...\n');

  // Load config
  const config = await loadOrPromptConfig();

  // Check for custom rules file
  const customRules = await loadCustomRules();
  const effectivePriorities = customRules
    ? { ...config.priorities, ...customRules }
    : config.priorities;

  if (editMode) {
    await interactiveEditor(effectivePriorities as OpsConfig['priorities']);
    // Show final state
    console.log('\n--- Current Rules ---\n');
    console.log(formatRulesTable(effectivePriorities as OpsConfig['priorities']));
  } else {
    // Just display current rules
    console.log(formatRulesTable(effectivePriorities as OpsConfig['priorities']));

    if (customRules) {
      console.log('\n*Custom weights loaded from ~/.ops/rules.json*');
    }

    console.log('\nTip: Run with --edit to interactively adjust weights.');
  }

  console.error('\n[ops:rules] Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
