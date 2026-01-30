---
name: ops:review-pr
description: Professional code review with ADO integration
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Task
  - AskUserQuestion
  - mcp__azure-devops__repo_get_pull_request_by_id
  - mcp__azure-devops__wit_get_work_item
  - mcp__azure-devops__repo_create_pull_request_thread
  - mcp__azure-devops__repo_list_pull_request_threads
---

<objective>
Professional, thorough code review for Azure DevOps Pull Requests.

Fetch actual code locally, verify against acceptance criteria, post comments to ADO.
</objective>

<input>
PR URL: $ARGUMENTS

Parse to extract: organization, project, repository, PR ID
</input>

<process>

## Phase 1: Gather Context

```
mcp__azure-devops__repo_get_pull_request_by_id(
  project: "{project}",
  pullRequestId: {id}
)
```

**Find linked work items:**
- Check PR relations for linked tickets
- If found, fetch work item details (title, description, acceptance criteria)
- If NO work item linked, ask user for context

## Phase 1b: Check Existing Review Activity

Before starting review, check if you've already reviewed this PR:

```
mcp__azure-devops__repo_list_pull_request_threads(
  project: "{project}",
  repositoryId: "{repo}",
  pullRequestId: {id}
)
```

**Analyze threads to determine status:**

1. **Find your previous comments** - Match author email to your identity
2. **Find your last comment timestamp** - When did you last post?
3. **Check for new commits** - Compare PR's lastMergeCommit date vs your last comment
4. **Check for replies** - Are there replies to your threads after your last comment?

**Display review status:**

| Status | Meaning | Action |
|--------|---------|--------|
| 🔴 First Review | No previous comments from you | Full review needed |
| 🟡 Re-review | New commits/replies since your last comment | Focus on changes since last review |
| 🟢 Waiting | You commented, no new activity | May not need action |

**If Re-review (🟡):**
- Show what changed since last review
- List new commits since your last comment
- Show any replies to your comments
- Focus review on the delta, not full PR

## Phase 2: Get the Code

**Locate repository locally:**
```bash
find ~/Projects -maxdepth 2 -type d -name "{repo-name}" 2>/dev/null
```

Common paths: `~/Projects/appxite/{repo}`, `~/Projects/scifi/{repo}`

**Fetch PR branch:**
```bash
cd {repo-path}
git fetch origin {source-branch}
git diff origin/{target-branch}...origin/{source-branch}
```

**NEVER proceed without actual code.**

## Phase 3: Review Analysis

| Category | Check |
|----------|-------|
| Correctness | Does code match AC? Logic errors? Edge cases? |
| Quality | Readable? Follows existing patterns? Code smells? |
| Performance | N+1 queries? Unnecessary loops? Memory leaks? |
| Security | Input validation? No sensitive data exposure? |
| Testing | Tests for new functionality? |

## Phase 4: Prepare Comments

For each issue found:

| Field | Content |
|-------|---------|
| Severity | Critical / Medium / Low / Suggestion |
| File:Line | Exact location |
| Issue | Clear description |
| Why | Impact if not fixed |
| Suggestion | How to fix |

## Phase 5: User Verification

Present findings in table:

```
| # | Severity | File:Line | Issue |
|---|----------|-----------|-------|
| 1 | Critical | file.cs:42 | Description... |
```

Ask:
1. Post all comments to PR
2. Modify/remove specific comments
3. Add more comments
4. Review again with explanation

## Phase 6: Post Comments

**Only after user approval.**

Post EACH comment INDIVIDUALLY using:

```
mcp__azure-devops__repo_create_pull_request_thread(
  project: "{project}",
  repositoryId: "{repo}",
  pullRequestId: {id},
  content: "{comment}",
  filePath: "/{path/to/file}",
  rightFileStartLine: {line},
  rightFileStartOffset: 1,
  rightFileEndLine: {line},
  rightFileEndOffset: {line_length}
)
```

**Required:** Always include offset parameters (not 0).

## Phase 7: Set Review Status

After posting comments, remind the user to set their vote status in Azure DevOps:

**Recommended vote based on findings:**

| Findings | Recommended Vote | ADO Status |
|----------|------------------|------------|
| Critical issues found | **Reject** | -10 (Rejected) |
| Medium issues, needs changes | **Wait for Author** | -5 (Waiting for Author) |
| Minor suggestions only | **Approve with Suggestions** | 5 (Approved with Suggestions) |
| No issues found | **Approve** | 10 (Approved) |

**Note:** The Azure DevOps MCP doesn't support setting votes programmatically. After posting comments:

1. Display the recommended vote based on severity of findings
2. Provide the direct link to set vote: `https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{id}`
3. Remind user: "Set your vote to **{recommended}** to mark as waiting for author"

**Output after posting comments:**
```
✅ Posted {N} comments to PR #{id}

📋 Recommended Action: Set vote to "Wait for Author" (-5)
🔗 Set vote: {PR URL}

Your review is complete. The PR is now waiting for the author to address your comments.
```

</process>

<output>
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CODE REVIEW: PR #{id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## PR Context

- **PR:** #{id} — {title}
- **Author:** {name}
- **Target:** {target} <- {source}
- **Linked Ticket:** #{work_item_id} — {ticket_title}

## Files Changed ({X} files, +{Y}/-{Z} lines)

- path/to/file1.cs (modified)
- path/to/file2.cs (added)

## Review Findings

[Detailed findings with code snippets]

## Summary

| # | Severity | File:Line | Issue |
|---|----------|-----------|-------|
| 1 | Critical | file.cs:42 | Description... |

## Verdict

{APPROVE / REQUEST CHANGES / NEEDS DISCUSSION}

───────────────────────────────────────────────────────────────────
```
</output>

<rules>
1. **NEVER review without actual code** — always fetch branch first
2. **NEVER assume** — if can't verify, state it clearly
3. **Be specific** — exact line numbers and code snippets
4. **Be constructive** — explain why and how to fix
5. **Respect developer** — professional tone
6. **Focus on what matters** — bugs and security over style nitpicks
7. **Check against AC** — verify implementation matches acceptance criteria
8. **Post individually** — one comment per issue, never consolidated
</rules>
