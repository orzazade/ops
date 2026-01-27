---
name: ops:sprint
description: Interactive sprint capacity management with TUI for moving work items
allowed-tools:
  - Read
  - Write
  - mcp__azure-devops__work_list_team_iterations
  - mcp__azure-devops__wit_get_work_items_for_iteration
  - mcp__azure-devops__wit_update_work_item
  - AskUserQuestion
---

<objective>
Manage sprint capacity and help move work items between sprints.

Shows current sprint capacity, suggests deferrals when over-committed, and helps move items to future sprints.
</objective>

<process>

## Step 1: Load Config

```
Read ~/.ops/config.yaml
```

Get team, project, and sprint capacity (default: 20 points).

## Step 2: Fetch Current Sprint

```
mcp__azure-devops__work_list_team_iterations(
  project: "{project}",
  team: "{team}",
  timeframe: "current"
)
```

## Step 3: Fetch Sprint Items

```
mcp__azure-devops__wit_get_work_items_for_iteration(
  project: "{project}",
  team: "{team}",
  iterationPath: "{current iteration path}"
)
```

## Step 4: Calculate Capacity

For each item, get story points:
- Use `Microsoft.VSTS.Scheduling.StoryPoints` field
- Default to 3 points if not set

**Utilization Thresholds:**
- <80%: Green - Good capacity
- 80-100%: Yellow - Near capacity
- 100-120%: Red - At capacity
- >120%: Bright Red - Over-committed

## Step 5: Present Sprint Status

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPRINT: {Sprint Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Capacity: {progress bar} {used}/{total} points ({percent}%)

{If over 120%:}
⚠️ Sprint is OVER-COMMITTED (>{percent}% capacity)
   Excess: {N} points over capacity

Suggested deferrals:
  - #{id}: {title}... ({reason})
  - #{id}: {title}... ({reason})

## Current Items

| # | ID | Title | Points | Priority | Age |
|---|:---|:------|-------:|:---------|----:|
| 1 | #{id} | {title} | {pts} | {P1/P2/P3} | {N}d |
| 2 | #{id} | {title} | {pts} | {P1/P2/P3} | {N}d |

───────────────────────────────────────────────────────────────────
```

## Step 6: Handle Item Selection

Use AskUserQuestion to let user select items to move:

```
Which items do you want to move to a future sprint?
```

Options: List of items with ID and title

## Step 7: Select Destination Sprint

Fetch future sprints:

```
mcp__azure-devops__work_list_team_iterations(
  project: "{project}",
  team: "{team}",
  timeframe: "future"
)
```

Use AskUserQuestion:

```
Where should these items go?
```

Options: List of future sprints

## Step 8: Execute Moves

For each selected item:

```
mcp__azure-devops__wit_update_work_item(
  id: {id},
  project: "{project}",
  updates: [
    {
      "op": "replace",
      "path": "/fields/System.IterationPath",
      "value": "{destination iteration path}"
    }
  ]
)
```

## Step 9: Confirm Results

```
✓ Moved {N} items to {Sprint Name}

Updated capacity: {new used}/{total} points ({new percent}%)

Items moved:
- #{id}: {title}
- #{id}: {title}
```

</process>

<deferral_logic>
When over-committed (>120%), suggest deferrals in this priority:

1. **P3 items** (lowest priority first)
2. **Oldest items** (been in backlog longest)
3. **Largest items** (biggest point reduction)

Never suggest deferring:
- P1 items (unless all else deferred)
- Items due this sprint
- Items blocking others
</deferral_logic>

<capacity_rules>
- Story points default to 3 if not set
- Sprint capacity from config (default: 20)
- Over-commitment threshold: 120%
</capacity_rules>
