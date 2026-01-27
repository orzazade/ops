---
name: ops:eod
description: Generate your personal end-of-day wrap-up with accomplishments and reflections
allowed-tools:
  - Read
  - Write
  - mcp__azure-devops__wit_my_work_items
  - mcp__azure-devops__wit_get_work_item
---

<objective>
Create a personal journal-style end-of-day summary that captures:
- What you accomplished today (completed, progressed)
- What's blocking you (with age tracking)
- What's carrying over to tomorrow (with reasons)

The output should feel like a personal reflection, not a status report.
</objective>

<process>

## Step 1: Load Config & Morning Baseline

```
Read ~/.ops/config.yaml
Read ~/.ops/state/briefing-{today}.yaml
Read ~/.ops/state/eod-{yesterday}.yaml
```

If no morning briefing exists, accomplishment tracking will be limited.

## Step 2: Fetch Current Work Items

```
mcp__azure-devops__wit_my_work_items(
  project: "{project}",
  type: "assignedtome",
  includeCompleted: true,
  top: 30
)
```

## Step 3: Detect Accomplishments

Compare current state to morning briefing:

**Completed:** Items now in Done/Closed that weren't this morning
**Progressed:** Items with activity today (comments, state changes)

## Step 4: Track Blockers

For items with blocked status or "blocked" tag:

- Check yesterday's EOD for blocker age
- Increment age if blocker continues
- New blockers start at Day 1

**Escalation threshold:** >= 3 days

## Step 5: Analyze Carryover

Items from morning briefing that weren't completed:

- **blocked**: Waiting on external dependency
- **partially_complete**: Made progress but not done
- **deprioritized**: Something more urgent came up
- **no_time**: Didn't get to it

## Step 6: Save EOD State

Write to `~/.ops/state/eod-{today}.yaml`:

```yaml
date: "{today}"
accomplished:
  completed: [{ids}]
  progressed: [{ids}]
blockers:
  - id: {id}
    age: {days}
carryover:
  - id: {id}
    reason: "{reason}"
```

## Step 7: Format Journal-Style Summary

```
╔══════════════════════════════════════════════════════════════╗
║                  END OF DAY — {Date}                         ║
╚══════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════╗
║  ACCOMPLISHMENTS                                              ║
╚══════════════════════════════════════════════════════════════╝

| Status | ID | Title |
|:------:|:---|:------|
| ✅ | #{id} | {title} |
| ✅ | #{id} | {title} |

Made Progress On
- - - - - - - - - - - - - - - - - - - - - - - - - - - -

| Status | ID | Title | Progress |
|:------:|:---|:------|:---------|
| 🚧 | #{id} | {title} | {what changed} |

╔══════════════════════════════════════════════════════════════╗
║  BLOCKERS                                                     ║
╚══════════════════════════════════════════════════════════════╝

| Status | ID | Title | Blocked | Action |
|:------:|:---|:------|--------:|:-------|
| ⛔ | #{id} | {title} | {N} days | {action} |
| ⚠️ | #{id} | {title} | {N} days | **Escalate** |

Carrying Over to Tomorrow
- - - - - - - - - - - - - - - - - - - - - - - - - - - -

| ID | Title | Reason | Tomorrow |
|:---|:------|:-------|:---------|
| #{id} | {title} | {reason} | {action} |

───────────────────────────────────────────────────────────────────
EOD saved for tomorrow's tracking
───────────────────────────────────────────────────────────────────
```

</process>

<emoji_guide>
- ✅ for completed items
- 🚧 for in-progress items
- ⛔ for blockers < 3 days
- ⚠️ for blockers >= 3 days (needs escalation)
</emoji_guide>

<tone_guidelines>
- Use **first person** ("I accomplished", "I'm blocked on")
- Be **honest** about what didn't get done
- Be **reflective** - acknowledge gaps and patterns
- Be **actionable** - focus on what to do next
- Avoid corporate jargon - this is a personal journal
</tone_guidelines>
