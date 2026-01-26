#!/usr/bin/env node
/**
 * CLI entry point for /ops:respond skill.
 *
 * Finds a briefing item by ID or keyword, generates response drafts with tone adaptation,
 * then outputs structured XML for Claude Code to format and present.
 */

import { generateResponseDraft } from '../integration/index.js';

async function main() {
  // Parse command line arguments
  const itemArg = process.argv.find(arg => arg.startsWith('--item='));

  if (!itemArg) {
    console.error('Usage: respond-cli.ts --item=<identifier>');
    console.error('Example: respond-cli.ts --item=12345');
    console.error('Example: respond-cli.ts --item="review PR"');
    process.exit(1);
  }

  // Extract identifier and strip quotes if present
  let identifier = itemArg.split('=')[1];

  if (!identifier) {
    console.error('Error: Item identifier cannot be empty');
    console.error('Usage: respond-cli.ts --item=<identifier>');
    process.exit(1);
  }

  // Strip surrounding quotes if present
  identifier = identifier.replace(/^["']|["']$/g, '');

  console.error(`[ops:respond] Finding item: ${identifier}\n`);

  const result = await generateResponseDraft(identifier);

  if (result.isErr()) {
    console.error('Error:', result.error.message);
    process.exit(1);
  }

  const { draft, context } = result.value;

  // Output the data as XML for Claude Code to process
  console.log('<response-data>');
  console.log(`  <item-title>${escapeXml(context.item.title)}</item-title>`);
  console.log(`  <item-type>${context.itemType}</item-type>`);
  console.log(
    `  <recipient>${escapeXml(context.recipientName || 'Team')}</recipient>`
  );
  console.log(`  <is-vip>${context.isVIP}</is-vip>`);
  console.log(
    `  <recipient-role>${context.recipientRole ? escapeXml(context.recipientRole) : ''}</recipient-role>`
  );
  console.log(`  <summary>${escapeXml(draft.summary)}</summary>`);

  console.log('  <options>');
  for (const option of draft.options) {
    console.log('    <option>');
    console.log(`      <label>${escapeXml(option.label)}</label>`);
    console.log(`      <tone>${option.tone}</tone>`);
    console.log(`      <text>${escapeXml(option.text)}</text>`);
    console.log(`      <rationale>${escapeXml(option.rationale)}</rationale>`);
    console.log('    </option>');
  }
  console.log('  </options>');

  console.log('  <context-notes>');
  for (const note of draft.context_notes) {
    console.log(`    <note>${escapeXml(note)}</note>`);
  }
  console.log('  </context-notes>');

  console.log('</response-data>');

  console.error('\n[ops:respond] Response options generated.');
}

/**
 * Escape special XML characters.
 * IMPORTANT: Ampersand first to avoid double-escaping.
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
