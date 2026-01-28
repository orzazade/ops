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
