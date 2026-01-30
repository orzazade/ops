---
name: ops:morning
description: Generate your morning work briefing from Azure DevOps
allowed-tools:
  - Read
  - Write
  - mcp__azure-devops__wit_my_work_items
  - mcp__azure-devops__wit_get_work_items_batch_by_ids
  - mcp__azure-devops__wit_get_work_item
  - mcp__azure-devops__wit_list_work_item_comments
  - mcp__azure-devops__repo_list_pull_requests_by_repo_or_project
  - mcp__azure-devops__repo_list_pull_request_threads
  - mcp__azure-devops__repo_get_pull_request_by_id
  - mcp__azure-devops__search_workitem
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

## Step 2b: Find Items Awaiting Your Input (Tagged Mentions)

Search for work items where you've been mentioned (@tagged) in comments.
These are items where someone is waiting for your input/response.

```
mcp__azure-devops__search_workitem(
  searchText: "@{user.name from config}",
  project: ["{project}"],
  state: ["New", "Active", "Design", "Ready for development", "PR Created", "QA in Progress"],
  top: 30
)
```

**Awaiting Input Detection Logic:**

For each search result that has `system.history` mentions:

1. **Fetch full comments:**
```
mcp__azure-devops__wit_list_work_item_comments(
  project: "{project}",
  workItemId: {id},
  top: 20
)
```

2. **Apply these filters (ALL must be true):**

   a) **Recent mention:** Comment with your mention was posted within LAST 7 DAYS
      - Check `createdDate` of comment mentioning you
      - Skip if mention is older than 7 days

   b) **Mentioned by someone else:** The comment was NOT created by you
      - Check `createdBy.uniqueName` !== your email from config
      - Skip if you mentioned yourself

   c) **You haven't responded since:** No comment from YOU after the mention date
      - Find the mention comment timestamp
      - Check if any later comment has `createdBy.uniqueName` === your email
      - If you commented AFTER being mentioned, skip (you already responded)

   d) **Item is still open:** State is NOT in closed states
      - Exclude: Closed, Resolved, Done, Removed, Tested, Verified
      - Include: New, Active, Design, Ready for development, PR Created, QA in Progress, onHold

3. **Extract context from the mentioning comment:**
   - Get the comment text where you were mentioned
   - Truncate to ~50 chars for display
   - Note who mentioned you and when

**Example logic pseudocode:**
```
for each work_item in search_results:
    if "system.history" not in hits: continue

    comments = fetch_comments(work_item.id)
    my_email = config.user.email.lower()

    for comment in comments:
        # Check if I'm mentioned in this comment
        if my_email not in str(comment.mentions): continue

        # Skip if I wrote this comment (mentioned myself)
        if comment.createdBy.uniqueName.lower() == my_email: continue

        # Skip if older than 7 days
        mention_date = parse(comment.createdDate)
        if mention_date < now - 7 days: continue

        # Check if I responded after this mention
        my_response_exists = any(
            c.createdBy.uniqueName.lower() == my_email
            and parse(c.createdDate) > mention_date
            for c in comments
        )
        if my_response_exists: continue

        # This is awaiting my input!
        add_to_awaiting_input(work_item, comment)
```

**Note:** The `mentions` array in comments contains identity IDs. Match your identity by:
- Comparing `mentions[].targetId` with your Azure DevOps identity ID, OR
- Checking if your name/email appears in the comment `text` with @ prefix

## Step 3: Fetch PRs Where You're Reviewer

```
mcp__azure-devops__repo_list_pull_requests_by_repo_or_project(
  project: "{project}",
  i_am_reviewer: true,
  status: "Active",
  top: 10
)
```

## Step 3b: Check PR Activity Status (for non-stale PRs)

For each PR that isn't obviously stale (< 60 days old), fetch threads to determine review status:

```
mcp__azure-devops__repo_list_pull_request_threads(
  project: "{project}",
  repositoryId: "{repo}",
  pullRequestId: {id}
)
```

Also get PR details for latest commit date:
```
mcp__azure-devops__repo_get_pull_request_by_id(
  project: "{project}",
  pullRequestId: {id}
)
```

**Determine PR status based on activity:**

1. **🔴 Needs Initial Review** - No comments from me yet
   - I haven't posted any comments/threads
   - Highest priority - author waiting on my review

2. **🟡 Needs Re-review** - New activity after my last comment
   - I posted comments, AND
   - There are new commits OR new replies after my last comment
   - Author has responded - requires my attention

3. **🟢 Waiting on Author** - Ball is in their court
   - I posted comments, AND
   - No new commits or replies after my last comment
   - Lower priority - author needs to respond

**How to detect:**
- Find my comments by matching author email/name to config user
- Compare my last comment timestamp vs PR's last commit timestamp
- Compare my last comment timestamp vs any replies in threads I started

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

Analyze all items and determine the top 10 priorities based on:

**IMPORTANT: Filter by Work Item Type AND Sprint**

**Type Filter:**
- **Include in Top Priorities:** User Story, Bug, Feature (these are the "what" you're working on)
- **Exclude from Top Priorities:** Task (these are the "how" - show separately as context)

**Sprint Filter:**
- **Include in Top Priorities:** Only items in the CURRENT sprint (from config: `sprint_planned.sprint`)
- **Exclude from Top Priorities:** Items in future sprints or backlog
- **Show separately:** Items from future sprints in a "Coming Up" section (optional, low priority)

Tasks are child items that break down Stories/Bugs/Features. Prioritize at the parent level, not the task level.
Focus on what's committed for THIS sprint - future work is noise in the morning briefing.

**Load sprint planned items from config:**
```
sprint_planned_ids = config.sprint_planned.items or []
```

**High Priority Signals:**
- P1 or P2 priority field
- Blocking other work (has "blocks" relationships)
- Due date within 3 days
- VIP involvement (from config)
- Urgent keywords in recent comments
- In current sprint iteration
- **Sprint planned** (EXTRA boost if item ID in `sprint_planned.items` - stacks with sprint iteration)
- Has active child tasks (indicates work in progress)

**Medium Priority Signals:**
- Active PR reviews (someone waiting on you)
- Items older than 5 days
- Has child items depending on it

**Lower Priority:**
- Backlog items not in sprint
- Items with no recent activity

## Step 6: Save State FIRST (Before Output)

**IMPORTANT: Save the briefing state BEFORE displaying output to the user.**

This ensures the final output appears at the end of the terminal, making it easy to read without scrolling back.

```
Write to ~/.ops/state/briefing-{date}.yaml
```

Save all work items, scores, PRs, mentions awaiting response, and notes. Do this silently (no confirmation message).

## Step 7: Format and Display Output

**After saving state**, present the briefing in a clean, scannable format.

**CRITICAL: Use proper markdown table syntax with alignment.**

Output this exact structure (not in a code block):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 MORNING BRIEFING — {date}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Awaiting Your Input

Show items where someone tagged you in comments within the LAST 7 DAYS and you haven't responded yet.
Only show if there are items found. Skip this section entirely if empty.

| ID | Title | Tagged By | Date | Context |
|:---|:------|:----------|:-----|:--------|
| #12345 | Design review needed | Maris Krumins | Jan 25 | "Please review the API design" |
| #12346 | Clarification needed | Nahid Jamalli | Jan 28 | "What should be the default value?" |

*You were mentioned in these items but haven't responded yet. Consider replying or acknowledging.*

## Top Priorities — {Sprint Name} (Current Sprint Only)

| # | Type | ID | Title | State | Score | Reason |
|:--|:-----|:---|:------|:------|------:|:-------|
| 1 | Bug | #12345 | Fix login timeout | Active | 85 | P1, blocking |
| 2 | Story | #12347 | Add caching | Active | 65 | Sprint planned |
| 3 | Feature | #12348 | New dashboard | Design | 60 | Sprint planned |

*Only showing items in current sprint. Future sprint items excluded from morning focus.*

## Active Tasks (for context)

Show tasks that are currently Active, grouped by parent:

| Parent | Task ID | Title | State |
|:-------|:--------|:------|:------|
| #12345 | #12350 | Implement fix | Active |
| #12347 | #12351 | Write unit tests | Active |

*Tasks are shown for context but don't compete with Stories/Bugs/Features in priority ranking.*

## PRs to Review

| Status | PR | Repo | Title | Author | Age | Action |
|:------:|:---|:-----|:------|:-------|----:|:-------|
| 🔴 | #456 | svc_api | Add retry logic | Jane | 2d | Initial review needed |
| 🟡 | #789 | svc_cpq | Fix validation | Bob | 5d | New commits after your review |
| 🟢 | #123 | svc_web | Update styles | Alice | 3d | Waiting on author |

**Status Legend:**
- 🔴 **Needs Initial Review** - You haven't reviewed yet (highest priority)
- 🟡 **Needs Re-review** - Author pushed changes or replied after your review
- 🟢 **Waiting on Author** - You reviewed, ball is in their court (lowest priority)

───────────────────────────────────────────────────────────────────
{N} items | {M} PRs | {K} awaiting input | {timestamp}
───────────────────────────────────────────────────────────────────

**Column specifications (Awaiting Your Input table):**
- **ID**: #{number} - the work item ID
- **Title**: Work item title (truncate to ~30 chars if needed)
- **Tagged By**: Name of person who mentioned you
- **Date**: Date of the mention (short format: Jan 25)
- **Context**: Brief excerpt from the comment (first ~40 chars of the relevant part)

**Column specifications (Top Priorities table):**
- **#**: Row number (1-10)
- **Type**: Bug, Story, Feature (NOT Task - Tasks shown separately)
- **ID**: #{number}
- **Title**: Truncate to ~30 chars if needed
- **State**: New, Active, Design, Resolved
- **Score**: 0-100, right-aligned
- **Reason**: Brief (P1, VIP, blocking, due, sprint)

**Column specifications (Active Tasks table):**
- **Parent**: #{parent_id} - the Story/Bug/Feature this task belongs to
- **Task ID**: #{number}
- **Title**: Task title
- **State**: Active only (don't show New/Closed tasks)

**Column specifications (PRs table):**
- **Status**: 🔴 (needs initial review) / 🟡 (needs re-review) / 🟢 (waiting on author)
- **PR**: #{number}
- **Repo**: Repository name
- **Title**: PR title (truncate if needed)
- **Author**: PR author name
- **Age**: Days since PR created
- **Action**: What you need to do

**PR Priority Order:**
1. 🔴 Needs Initial Review (sorted by age, oldest first)
2. 🟡 Needs Re-review (sorted by last activity)
3. 🟢 Waiting on Author (lowest priority, can often skip)

**Scoring weights (from config.priorities):**
- P1 priority: +30 (p1_priority * 15)
- Overdue: +25
- VIP involved: +25 (vip_involvement * ~8)
- Blocking others: +20 (blocking_others * 10)
- P2 priority: +20 (p2_priority * 20)
- Due within 3 days: +15
- In current sprint: +10 (any item in current iteration)
- **Sprint planned: +15** (EXTRA, stacks - sprint_commitment * 5, if item ID in sprint_planned.items)
- **Has active child tasks: +10** (indicates work already in progress)
- Age > 5 days: +10 (age_over_3_days * 5)

**Sprint scoring is additive:**
- Item in sprint but NOT planned: +10
- Item in sprint AND planned: +10 + +15 = +25

**Task handling:**
- Tasks are filtered OUT of the Top Priorities table
- Tasks with state=Active are shown in a separate "Active Tasks" section
- Parent items with active tasks get a +10 score boost (work in progress)

</process>

<reasoning_guidelines>
When deciding priority order, explain your reasoning:
- "This is #1 because it's P1 AND blocking two other items"
- "Moved up because John (VIP) asked about status yesterday"
- "Lower priority - backlog item, no due date, no recent activity"

Be specific about WHY items are prioritized, not just WHAT the priority is.
</reasoning_guidelines>

<execution_order>
**Critical execution order:**
1. Fetch all data (work items, PRs, mentions)
2. Calculate scores and rank items
3. **Save state to file FIRST** (Step 6)
4. **Then display output LAST** (Step 7)

This ensures the briefing output is at the bottom of the terminal for easy reading.
</execution_order>
