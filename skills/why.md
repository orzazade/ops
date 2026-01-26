---
name: ops:why
description: Show score breakdown for a specific item
allowed-tools:
  - Bash
  - Read
---

<objective>
Show the score breakdown for a specific work item or PR, explaining why it's ranked the way it is.
</objective>

<process>

## Step 1: Get Item ID

The user provides an item ID. If not provided, ask for it.

## Step 2: Run Why CLI

```bash
cd /Users/orkhanrzazade/Projects/scifi/ops && npx tsx src/scripts/why-cli.ts <id> [--type=work_item|pull_request] 2>&1
```

Default type is work_item. Use --type=pull_request for PRs.

## Step 3: Present Results

Show the score breakdown in this format:

```
# Score Breakdown: [Title]

[Prose explanation from CLI output]

**Current rank:** #N of M items

[If boosted/demoted]: Currently boosted/demoted by X points (expires at midnight)
```

</process>

<troubleshooting>
- **Item not found**: Check if the ID is correct. Run /ops:priorities to see available items.
- **ADO error**: Check AZURE_DEVOPS_PAT environment variable is set.
</troubleshooting>
