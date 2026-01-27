---
name: ops:boost
description: Temporarily boost an item's priority
allowed-tools:
  - Read
  - Write
  - mcp__azure-devops__wit_get_work_item
---

<objective>
Manually boost a work item's priority. The boost persists until end of day or until removed.
</objective>

<process>

## Step 1: Parse Item ID

Extract the work item ID from the user's command (e.g., `/ops:boost 1234`).

## Step 2: Load Config & Verify Item

```
Read ~/.ops/config.yaml
```

Then verify the item exists:
```
mcp__azure-devops__wit_get_work_item(id: {id}, project: "{project}")
```

## Step 3: Add to Overrides

Read current overrides (create if doesn't exist):
```
Read ~/.ops/state/overrides.yaml
```

Add the boost:
```yaml
overrides:
  - id: {id}
    type: boost
    reason: "Manually boosted"
    timestamp: "{now}"
    expires: "{end of today}"
```

Write back:
```
Write ~/.ops/state/overrides.yaml
```

## Step 4: Confirm

```
✓ Boosted #{id}: {title}

This item will appear higher in /ops:priorities until end of day.
To remove: /ops:demote {id}
```

</process>

<notes>
- Boosts expire at midnight
- Re-boosting replaces previous boost (no stacking)
- Use /ops:demote to lower priority instead
</notes>
