---
name: ops:rules
description: View or edit scoring rules
allowed-tools:
  - Bash
---

<objective>
View current scoring rules or interactively edit weight values.
</objective>

<process>

## Step 1: Determine Mode

- If user wants to see rules: Run without --edit
- If user wants to change rules: Run with --edit

## Step 2: Run Rules CLI

**View only:**
```bash
cd /Users/orkhanrzazade/Projects/scifi/ops && npx tsx src/scripts/rules-cli.ts 2>&1
```

**Interactive edit:**
```bash
cd /Users/orkhanrzazade/Projects/scifi/ops && npx tsx src/scripts/rules-cli.ts --edit 2>&1
```

## Step 3: Format Output

Present the rules table to the user. If in edit mode, the CLI will prompt interactively.

</process>

<rule-categories>
- **Priority**: P1, P2 work item priority levels
- **People**: VIP involvement (assigned to or from important contacts)
- **Age**: Items older than 3 days
- **State**: Sprint commitment, blocking others, carried over from previous sprint
</rule-categories>

<notes>
- Custom weights are saved to ~/.ops/rules.json
- Use "Reset to defaults" in edit mode to restore original weights
- Changes take effect immediately for future priority calculations
</notes>
