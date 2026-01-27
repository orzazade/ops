---
name: ops:demote
description: Temporarily demote an item's priority
allowed-tools:
  - Read
  - Write
  - mcp__azure-devops__wit_get_work_item
---

<objective>
Manually demote a work item's priority. The demotion persists until end of day or until removed.
</objective>

<process>

## Step 1: Parse Item ID

Extract the work item ID from the user's command (e.g., `/ops:demote 1234`).

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

Add the demotion:
```yaml
overrides:
  - id: {id}
    type: demote
    reason: "Manually demoted"
    timestamp: "{now}"
    expires: "{end of today}"
```

Write back:
```
Write ~/.ops/state/overrides.yaml
```

## Step 4: Confirm

```
✓ Demoted #{id}: {title}

This item will appear lower in /ops:priorities until end of day.
To remove: /ops:boost {id}
```

</process>

<notes>
- Demotions expire at midnight
- Re-demoting replaces previous demotion (no stacking)
- Use /ops:boost to raise priority instead
</notes>
