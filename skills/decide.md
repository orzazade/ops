---
name: ops:decide
description: Get a personalized work recommendation based on priorities and time of day
allowed-tools:
  - Read
  - mcp__azure-devops__wit_my_work_items
  - mcp__azure-devops__wit_get_work_item
  - mcp__azure-devops__repo_list_pull_requests_by_repo_or_project
---

<objective>
Generate a personalized recommendation for what to work on next, considering:
- Current priority scores (with manual boost/demote overrides)
- Time of day (deep work vs meeting vs admin hours)
- Work type classification (deep vs quick vs collaborative)
- Alternative options when multiple items have similar priority
</objective>

<process>

## Step 1: Load Config & Overrides

```
Read ~/.ops/config.yaml
Read ~/.ops/state/overrides.yaml
Read ~/.ops/rules.json (if exists, for custom weights)
```

## Step 2: Fetch Current Work

```
mcp__azure-devops__wit_my_work_items(
  project: "{project}",
  type: "assignedtome",
  includeCompleted: false,
  top: 20
)

mcp__azure-devops__repo_list_pull_requests_by_repo_or_project(
  project: "{project}",
  i_am_reviewer: true,
  status: "Active",
  top: 10
)
```

## Step 3: Detect Time Context

Based on current time:

| Time | Context | Best Work Type |
|------|---------|----------------|
| 8-11am | Deep work | Complex tasks requiring focus |
| 11am-2pm | Meeting mode | Collaborative work, PR reviews |
| 2-5pm | Admin mode | Quick wins, admin tasks, cleanup |
| After 5pm | After-hours | Flexible, respect off-hours |

## Step 4: Score and Rank Items

Apply priority scoring:

| Signal | Weight |
|--------|--------|
| P1 Priority | +30 |
| P2 Priority | +20 |
| VIP involved | +25 |
| Blocking others | +20 |
| Due within 3 days | +15 |
| Overdue | +25 |
| Sprint commitment | +15 |
| Older than 5 days | +10 |

Apply overrides:
- Boosted items: +50
- Demoted items: -30

## Step 5: Match to Time Context

For each item, classify work type:

- **Deep work**: Bug fixes, feature development, complex analysis
- **Collaborative**: PR reviews, discussions, meetings
- **Quick wins**: Small fixes, documentation, admin tasks

Score bonus for time-fit:
- Perfect match: +15
- Acceptable: +5
- Poor match: -10

## Step 6: Generate Recommendation

Select top item and identify alternatives (within 10% score).

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 WORK RECOMMENDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **I recommend: {item title}**

{Reasoning: why this item, what signals matched, time fit}

**Estimated effort:** {duration} ({reasoning})

**Suggested first action:**
{concrete next step to start the work}

**You could also work on:**
- {alternative title} — {brief reason}
- {alternative title} — {brief reason}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</process>

<special_cases>

**No work available:**
```
🎉 **All caught up!**

No work items or pull requests found that need your attention right now.

This is a great time to:
- Take a break and recharge
- Review your long-term goals
- Help teammates with their work
- Learn something new
```

**Low confidence (no strong signals):**
```
⚠️ **Low confidence in recommendation**

{reasoning - why no clear winner}

**Top candidate:** {item title}

I suggest:
- Review your priority configuration with `/ops:rules`
- Or take a break - it's valid to step away when priorities are unclear
```

</special_cases>

<related_commands>
- `/ops:priorities` - See full priority list
- `/ops:boost <id>` - Temporarily boost an item
- `/ops:demote <id>` - Temporarily demote an item
- `/ops:why <id>` - See detailed score breakdown
</related_commands>
