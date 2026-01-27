---
name: ops:status
description: Generate project status report for leadership
allowed-tools:
  - Read
  - mcp__azure-devops__wit_my_work_items
  - mcp__azure-devops__wit_get_work_item
  - mcp__azure-devops__repo_list_pull_requests_by_repo_or_project
  - mcp__azure-devops__wit_get_query_results_by_id
---

<objective>
Generate a leadership-ready status report for a specific project by gathering data from Azure DevOps.
</objective>

<process>

## Step 1: Extract Project Name

Get the project name from the user's command:
- "/ops:status CPQ" -> project = "CPQ"
- "/ops:status sku-builder" -> project = "sku-builder"
- If no project specified, ask user which project they want status for.

## Step 2: Load Config

```
Read ~/.ops/config.yaml
```

## Step 3: Gather Project Data

Fetch work items for the project:

```
mcp__azure-devops__wit_my_work_items(
  project: "{project}",
  type: "assignedtome",
  includeCompleted: false,
  top: 50
)
```

Fetch PRs:

```
mcp__azure-devops__repo_list_pull_requests_by_repo_or_project(
  project: "{project}",
  status: "all",
  top: 20
)
```

## Step 4: Filter by Project Keywords

Filter work items and PRs that match the project name in:
- Title
- Area path
- Tags
- Repository name

## Step 5: Analyze Project Health

**Determine Overall Status:**

| Status | Criteria |
|--------|----------|
| ON-TRACK | No blockers, work progressing, no overdue items |
| AT-RISK | Minor blockers or 1-2 items at risk |
| DELAYED | Multiple blockers or overdue commitments |
| BLOCKED | Critical blocker preventing progress |

**Identify:**
- Recent completions (last 7 days)
- Current work in progress
- Blockers and risks
- Upcoming priorities

## Step 6: Generate Status Report

```
# Project Status: {Project Name}
**Date:** {date}
**Overall Status:** {ON-TRACK/AT-RISK/DELAYED/BLOCKED}

## Executive Summary
{2-3 sentences summarizing project health and key updates}

## Key Highlights
- {achievement 1}
- {achievement 2}
- {achievement 3}

## Risks
| Risk | Severity | Mitigation |
|------|----------|------------|
| {risk description} | {low/medium/high/critical} | {mitigation plan} |

## Blockers
- **{blocker}**: {action needed}

## Next Steps
- [ ] {priority 1}
- [ ] {priority 2}
- [ ] {priority 3}

## Metrics
- Work items: {X} completed this week, {Y} in progress
- Pull requests: {X} merged, {Y} pending review

---
*Generated: {timestamp}*
```

</process>

<format_options>
User can request different formats:

**--format=email**: Generate HTML suitable for Outlook/Gmail
**--format=slack**: Generate Slack mrkdwn format

Default is markdown.
</format_options>

<status_indicators>

**ON-TRACK indicators:**
- Sprint commitments on track
- No critical blockers
- Recent progress visible

**AT-RISK indicators:**
- Some items slipping
- Dependencies unclear
- Resource constraints

**DELAYED indicators:**
- Missed sprint commitments
- Multiple items overdue
- Scope creep detected

**BLOCKED indicators:**
- Critical external dependency
- Cannot proceed without resolution
- Escalation required

</status_indicators>
