---
name: ops:demote
description: Temporarily demote an item's priority
allowed-tools:
  - Bash
---

<objective>
Temporarily demote an item's priority score so it appears lower in rankings. The demote expires at midnight.
</objective>

<process>

## Step 1: Get Item ID

The user provides an item ID. If not provided, ask for it.

## Step 2: Run Demote CLI

```bash
cd /Users/orkhanrzazade/Projects/scifi/ops && npx tsx src/scripts/demote-cli.ts <id> [--type=work_item|pull_request] [--amount=10] 2>&1
```

Default amount is 10 points. Default type is work_item.

## Step 3: Confirm Demote

Confirm to the user:
- Item has been demoted
- Demote amount and expiry time
- Suggest running /ops:priorities to see updated ranking

</process>

<notes>
- Demotes expire at midnight UTC
- Re-demoting the same item replaces the previous demote (no stacking)
- Use /ops:boost to move items up instead
</notes>
