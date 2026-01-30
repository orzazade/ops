---
name: ops:sprint-plan
description: Set planned items for the current sprint (get priority boost)
allowed-tools:
  - Read
  - Write
  - Edit
  - mcp__azure-devops__work_list_team_iterations
  - mcp__azure-devops__wit_get_work_items_for_iteration
  - mcp__azure-devops__wit_get_work_items_batch_by_ids
  - AskUserQuestion
---

<objective>
Set which work items are your planned sprint commitments. These items get the `sprint_commitment` priority weight boost in morning briefings and priority calculations.
</objective>

<usage>
```
/ops:sprint-plan              # Interactive - shows sprint items, lets you select
/ops:sprint-plan 80639 80646  # Direct - set specific IDs as planned
/ops:sprint-plan clear        # Clear all planned items
/ops:sprint-plan show         # Show current planned items
```
</usage>

<process>

## Step 1: Load Config

```
Read ~/.ops/config.yaml
```

## Step 2: Handle Arguments

**If arguments provided:**
- `clear` → Remove `sprint_planned` section from config
- `show` → Display current planned items and exit
- `{id} {id} ...` → Set these IDs as planned items (skip to Step 5)

**If no arguments:** Continue to Step 3 for interactive mode.

## Step 3: Fetch Current Sprint

```
mcp__azure-devops__work_list_team_iterations(
  project: "{project}",
  team: "{team}",
  timeframe: "current"
)
```

## Step 4: Fetch Sprint Items & Display

```
mcp__azure-devops__wit_get_work_items_for_iteration(
  project: "{project}",
  team: "{team}",
  iterationPath: "{current iteration path}"
)
```

Display items in a table:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPRINT PLANNING: {Sprint Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current sprint items assigned to you:

| ID | Type | Title | State | Planned |
|:---|:-----|:------|:------|:--------|
| 80639 | Story | UI Offer Creation Form | Active | ✓ |
| 80646 | Story | Redesign Offer Grid | Design | |

───────────────────────────────────────────────────────────────────
```

Use AskUserQuestion to let user select items or enter IDs.

## Step 5: Update Config

Update `~/.ops/config.yaml` with the `sprint_planned` section:

```yaml
# Sprint planned items (committed at sprint start)
# These items get sprint_commitment priority weight boost
sprint_planned:
  sprint: "Sprint 213"
  items:
    - 80639
    - 80646
    - 80653
```

Use Edit tool to update the config file. If `sprint_planned` section exists, replace it. If not, add it after the `priorities` section.

## Step 6: Confirm

```
✓ Set {N} planned items for {Sprint Name}

Planned items:
- #80639: UI Offer Creation Form
- #80646: Redesign Offer Grid

These items will get +{sprint_commitment weight} priority boost in briefings.
Run `/ops:morning` to see updated priorities.
```

</process>

<config_format>
The `sprint_planned` section in `~/.ops/config.yaml`:

```yaml
# Sprint planned items (committed at sprint start)
# These items get sprint_commitment priority weight boost
sprint_planned:
  sprint: "Sprint 213"    # Sprint name for reference
  items:                   # List of work item IDs
    - 80639
    - 80646
    - 80653
```
</config_format>

<integration>
The `/ops:morning` and `/ops:priorities` commands should check:

```
if item.id in config.sprint_planned.items:
    score += priorities.sprint_commitment  # Default: 3
```

Only items explicitly listed get the boost - not all items in the sprint.
</integration>
