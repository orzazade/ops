---
name: ops:research
description: Deep-dive investigation of a work item with parallel research
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Task
  - WebSearch
  - mcp__azure-devops__wit_get_work_item
  - mcp__azure-devops__wit_list_work_item_comments
  - mcp__azure-devops__search_workitem
  - mcp__azure-devops__search_wiki
  - mcp__azure-devops__repo_list_repos_by_project
---

<objective>
Deep investigation using PARALLEL research:
1. Fetch ticket from ADO
2. Run 3 parallel searches (local code + best practices + related items)
3. Synthesize and assess

Parallel = faster + more thorough.
</objective>

<workflow_states>
```
Design → Ready for Dev → In Development → PR Created → QA Verification → Closed
```

| State | Code Status |
|-------|-------------|
| Design / Ready for Dev | No code yet |
| In Development | Feature branch |
| PR Created | Pending review |
| QA Verification | Code DONE, in develop |
| Closed | Complete |
</workflow_states>

<process>

## Step 1: Fetch Ticket

```
Read ~/.ops/config.yaml
mcp__azure-devops__wit_get_work_item(id, project, expand: "relations,fields")
mcp__azure-devops__wit_list_work_item_comments(project, workItemId, top: 10)
```

## Step 2: Ensure Repo Local

```bash
REPO="{repo from area path}"
[ -d ~/Projects/appxite/$REPO ] || \
  (cd ~/Projects/appxite && git clone git@ssh.dev.azure.com:v3/{org}/{project}/$REPO)
cd ~/Projects/appxite/$REPO && git checkout develop && git pull
```

## Step 3: PARALLEL RESEARCH

**Spawn 3 agents in ONE message (parallel execution):**

```
Task(
  prompt="Search ~/Projects/appxite/{repo} for: {keywords}
  Find: related files, existing patterns, similar implementations
  Return: file:line references with context",
  subagent_type="Explore",
  description="Code search"
)

Task(
  prompt="Research best practices for: {feature/problem}
  Tech stack: {.NET/React/etc from context}
  Find: standard approaches, common patterns, pitfalls, recommended libraries
  Be specific and actionable.",
  subagent_type="general-purpose",
  description="Best practices"
)

Task(
  prompt="Search ADO for context on: {keywords}
  Use mcp__azure-devops__search_workitem and search_wiki
  Find: similar tickets, parent epic context, wiki docs
  Return: IDs, titles, key insights",
  subagent_type="general-purpose",
  description="Related items"
)
```

**All 3 run simultaneously. Wait for all.**

## Step 4: Synthesize

Combine:
- **Code search**: What exists, what patterns to follow
- **Best practices**: What industry recommends
- **Related items**: What context/history exists

## Step 5: Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RESEARCH: #{id} — {title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Summary

**Type:** {type} | **State:** {state} → {meaning}
**Repo:** ~/Projects/appxite/{repo}
**Confidence:** {High/Medium/Low}

{2-3 sentences}

## Ticket Quality

| Aspect | Status |
|--------|--------|
| Description | {status} |
| Acceptance Criteria | {status} |
| Technical Context | {status} |

## Code Found

**Files to modify:**
- `{file}:{line}` — {what}

**Existing patterns:**
- `{file}` — {pattern}

## Best Practices (Web Research)

**Recommended approach:**
{what industry/community says}

**Common patterns:**
- {pattern}

**Pitfalls to avoid:**
- {pitfall}

## Related Items

| ID | Title | Relevance |
|----|-------|-----------|
| #{id} | {title} | {why relevant} |

## Brutal Assessment

**Is this the right approach?**
{Challenge it. Question assumptions.}

**Problems:**
- {issue}

**Better alternatives:**
- {alternative}

**Verdict:** GOOD / NEEDS RETHINK / RED FLAG

## Next Steps

1. {action}
2. {action}

───────────────────────────────────────────────────────────────────
```

</process>

<brutal_rules>
Challenge everything:
- Overengineered? Too hacky?
- Reinventing existing solution?
- Following codebase patterns or creating new ones?
- Will scale? Maintainable?
- Security issues?

Compare proposed approach vs:
- What codebase already does
- What best practices say
- Simpler alternatives
</brutal_rules>
