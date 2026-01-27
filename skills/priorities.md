---
name: ops:priorities
description: Re-rank your priorities throughout the day with delta visualization
allowed-tools:
  - Read
  - Write
  - mcp__azure-devops__wit_my_work_items
  - mcp__azure-devops__wit_get_work_item
  - mcp__azure-devops__wit_list_work_item_comments
  - mcp__azure-devops__repo_list_pull_requests_by_repo_or_project
---

<objective>
Show your current priorities with visual indicators for what's new, completed, or changed since your morning briefing.
</objective>

<process>

## Step 1: Load Config & Morning Baseline

```
Read ~/.ops/config.yaml
Read ~/.ops/state/briefing-{today}.yaml
```

If no morning briefing exists, this becomes a fresh priority list.

## Step 2: Fetch Current Data

Same as morning briefing - get work items and PRs:

```
mcp__azure-devops__wit_my_work_items(project, type: "assignedtome", top: 20)
mcp__azure-devops__repo_list_pull_requests_by_repo_or_project(project, i_am_reviewer: true)
```

## Step 3: Load Overrides

Check for manual boosts/demotes:

```
Read ~/.ops/state/overrides.yaml
```

Apply any score adjustments from `/ops:boost` or `/ops:demote`.

## Step 4: Re-Rank and Compare

1. Apply same priority reasoning as morning
2. Compare to morning baseline to detect:
   - **NEW**: Items not in morning list
   - **DONE**: Items completed since morning
   - **CHANGED**: Items whose priority shifted
   - **UNCHANGED**: Same position as morning

## Step 5: Format with Delta Markers

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 YOUR PRIORITIES — {time since morning}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Delta: +{N} new | ↑{M} changed | ✓{K} done

1. **{Title}** #{id}
   {reasoning}

2. 🆕 **{Title}** #{id}
   Why new: {appeared because...}

3. ↑ **{Title}** #{id}
   Why changed: {moved up because...}

---
✓ ~~Completed Item~~ #{id}

───────────────────────────────────────────────────────────────────
Legend: 🆕 New | ↑ Changed | ✓ Done
───────────────────────────────────────────────────────────────────
```

</process>

<commands>
**Pin an item** (keep at top regardless of signals):
`/ops:priorities --pin {id}`

**Unpin an item**:
`/ops:priorities --unpin {id}`

Pins are stored in `~/.ops/state/pins.yaml` and persist across sessions.
</commands>

<pin_handling>
When user says `--pin {id}`:
1. Fetch the item details
2. Add to ~/.ops/state/pins.yaml
3. Confirm: "Pinned #{id}: {title}"

Pinned items always appear first, marked with 📌
</pin_handling>
