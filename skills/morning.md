---
name: ops:morning
description: Generate your morning work briefing from Azure DevOps
allowed-tools:
  - Read
  - mcp__azure-devops__wit_my_work_items
  - mcp__azure-devops__wit_get_work_item
  - mcp__azure-devops__wit_list_work_item_comments
  - mcp__azure-devops__repo_list_pull_requests_by_repo_or_project
---

<objective>
Generate a prioritized morning briefing by gathering your work items and PRs from Azure DevOps, then reasoning about what deserves your attention first.
</objective>

<process>

## Step 1: Load Config

Read the ops config to get organization, project, and VIPs:

```
Read ~/.ops/config.yaml
```

If no config exists, tell user to run `/ops:config` first.

## Step 2: Fetch Work Items

Use the Azure DevOps MCP tools to get your assigned work items:

```
mcp__azure-devops__wit_my_work_items(
  project: "{project from config}",
  type: "assignedtome",
  includeCompleted: false,
  top: 20
)
```

## Step 3: Fetch PRs Where You're Reviewer

```
mcp__azure-devops__repo_list_pull_requests_by_repo_or_project(
  project: "{project}",
  i_am_reviewer: true,
  status: "Active",
  top: 10
)
```

## Step 4: Enrich Top Items (Optional)

For the top 5-7 items by your initial assessment, fetch comments to understand urgency:

```
mcp__azure-devops__wit_list_work_item_comments(
  project: "{project}",
  workItemId: {id},
  top: 5
)
```

Look for urgency signals in comments like:
- "blocking", "blocked", "urgent", "ASAP"
- Questions from VIPs
- Due date mentions

## Step 5: Reason About Priorities

Analyze all items and determine the top 5 priorities based on:

**High Priority Signals:**
- P1 or P2 priority field
- Blocking other work (has "blocks" relationships)
- Due date within 3 days
- VIP involvement (from config)
- Urgent keywords in recent comments
- Sprint commitment (in current iteration)

**Medium Priority Signals:**
- Active PR reviews (someone waiting on you)
- Items older than 5 days
- Has child items depending on it

**Lower Priority:**
- Backlog items not in sprint
- Items with no recent activity

## Step 6: Format Output

Present the briefing:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 MORNING BRIEFING — {date}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Summary

{2-3 sentences: what's most important today and why}

## Top Priorities

1. **{Title}** #{id} _{signals}_
   Why: {reasoning based on signals detected}
   Action: {suggested next step}

2. ...

## Needs Response

{Items with questions or comments needing your reply}

## PRs to Review

{Active PRs where you're a reviewer}

───────────────────────────────────────────────────────────────────
{N} work items | {M} PRs | Generated: {timestamp}
───────────────────────────────────────────────────────────────────
```

</process>

<reasoning_guidelines>
When deciding priority order, explain your reasoning:
- "This is #1 because it's P1 AND blocking two other items"
- "Moved up because John (VIP) asked about status yesterday"
- "Lower priority - backlog item, no due date, no recent activity"

Be specific about WHY items are prioritized, not just WHAT the priority is.
</reasoning_guidelines>

<state>
After generating the briefing, save it for delta comparison later:

```
Write to ~/.ops/state/briefing-{date}.yaml
```

This enables `/ops:priorities` to show what changed since morning.
</state>
