---
name: ops:why
description: Show why an item has its current priority
allowed-tools:
  - Read
  - mcp__azure-devops__wit_get_work_item
  - mcp__azure-devops__wit_list_work_item_comments
---

<objective>
Explain why a specific work item has its current priority ranking. Shows all the signals detected and reasoning.
</objective>

<process>

## Step 1: Parse Item ID

Extract the work item ID from the user's command (e.g., `/ops:why 1234`).

## Step 2: Load Config

```
Read ~/.ops/config.yaml
```

## Step 3: Fetch Full Item Details

```
mcp__azure-devops__wit_get_work_item(
  id: {id},
  project: "{project}",
  expand: "relations"
)
```

Also fetch recent comments:
```
mcp__azure-devops__wit_list_work_item_comments(
  project: "{project}",
  workItemId: {id},
  top: 5
)
```

## Step 4: Analyze Signals

Check for all priority signals:

| Signal | Check | Weight |
|--------|-------|--------|
| P1 Priority | priority field = 1 | High |
| P2 Priority | priority field = 2 | Medium |
| Blocking | has "blocks" relations | High |
| Blocked | has "blocked by" relations | Medium |
| VIP Involved | assignee/author in VIP list | High |
| Due Soon | due date within 3 days | High |
| Overdue | past due date | Very High |
| Sprint Item | in current iteration | Medium |
| Urgent Comments | keywords in recent comments | High |
| Stale | no activity > 5 days | Low |

## Step 5: Check Overrides

```
Read ~/.ops/state/overrides.yaml
```

Check if item has been manually boosted or demoted.

## Step 6: Present Analysis

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 WHY #{id} — {title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Signals Detected

✓ P1 Priority — this is marked as critical
✓ Blocking #5678 — "Fix login flow" is waiting on this
✓ VIP: John Smith — assigned to your VIP contact
✗ Due date — none set
✗ Urgent comments — no urgent keywords found

## Priority Assessment

This item ranks HIGH because:
- P1 priority indicates critical work
- It's blocking another item, causing cascading delays
- VIP involvement suggests organizational visibility

## Overrides

{None | Boosted until midnight | Demoted until midnight}

───────────────────────────────────────────────────────────────────
```

</process>
