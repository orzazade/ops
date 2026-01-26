---
name: ops:boost
description: Temporarily boost an item's priority
allowed-tools:
  - Bash
---

<objective>
Temporarily boost an item's priority score so it appears higher in rankings. The boost expires at midnight.
</objective>

<process>

## Step 1: Get Item ID

The user provides an item ID. If not provided, ask for it.

## Step 2: Run Boost CLI

```bash
cd /Users/orkhanrzazade/Projects/scifi/ops && npx tsx src/scripts/boost-cli.ts <id> [--type=work_item|pull_request] [--amount=10] 2>&1
```

Default amount is 10 points. Default type is work_item.

## Step 3: Confirm Boost

Confirm to the user:
- Item has been boosted
- Boost amount and expiry time
- Suggest running /ops:priorities to see updated ranking

</process>

<notes>
- Boosts expire at midnight UTC
- Re-boosting the same item replaces the previous boost (no stacking)
- Use /ops:demote to move items down instead
</notes>
