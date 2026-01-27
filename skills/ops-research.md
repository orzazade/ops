---
name: ops:ops-research
description: Deep-dive investigation of an Azure DevOps work item
allowed-tools:
  - Read
  - Grep
  - Glob
  - mcp__azure-devops__wit_get_work_item
  - mcp__azure-devops__wit_list_work_item_comments
  - mcp__azure-devops__search_code
  - mcp__azure-devops__search_wiki
  - mcp__azure-devops__search_workitem
---

<objective>
Investigate a work item to understand requirements, find related code, and identify gaps.

Produces a comprehensive research summary with:
- Ticket quality assessment
- Related items and context
- Code areas affected
- Documentation references
- Suggested improvements
</objective>

<process>

## Step 1: Parse Ticket ID

Extract the work item ID from user command:
- "/ops:ops-research 12345"
- "/ops:ops-research #12345"

## Step 2: Load Config

```
Read ~/.ops/config.yaml
```

## Step 3: Fetch Work Item Details

```
mcp__azure-devops__wit_get_work_item(
  id: {id},
  project: "{project}",
  expand: "relations,fields"
)
```

Extract:
- Title, description, acceptance criteria
- Type (Bug, User Story, Task, etc.)
- Area path, iteration path
- Relations (parent, child, related, blocks/blocked by)
- Tags

## Step 4: Fetch Comments

```
mcp__azure-devops__wit_list_work_item_comments(
  project: "{project}",
  workItemId: {id},
  top: 20
)
```

Look for:
- Context and history
- Decisions made
- Questions raised
- Technical details

## Step 5: Search Related Work Items

```
mcp__azure-devops__search_workitem(
  searchText: "{keywords from title and description}",
  project: "{project}",
  top: 10
)
```

Find similar or related tickets by:
- Same area path
- Similar keywords
- Related epics/features

## Step 6: Search Codebase

```
mcp__azure-devops__search_code(
  searchText: "{technical keywords}",
  project: "{project}",
  top: 10
)
```

Also use local search if in a repo:

```
Grep for relevant patterns
Glob for related file patterns
```

Identify:
- Files likely affected
- Existing implementations
- Test coverage

## Step 7: Search Wiki/Documentation

```
mcp__azure-devops__search_wiki(
  searchText: "{feature keywords}",
  project: "{project}",
  top: 5
)
```

Find:
- Design documents
- Architecture decisions
- Related specifications

## Step 8: Assess Ticket Quality

Evaluate:

| Aspect | Status | Notes |
|--------|--------|-------|
| Description | {Good/Needs work/Missing} | {details} |
| Acceptance Criteria | {Complete/Partial/Missing} | {details} |
| Technical Context | {Clear/Vague/Missing} | {details} |
| Reproducibility (bugs) | {Clear/Vague/N/A} | {details} |
| Definition of Done | {Clear/Implicit/Missing} | {details} |

## Step 9: Generate Investigation Summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 INVESTIGATION: #{id} — {title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Summary

**Type:** {Bug/Feature/Task}
**Area:** {area path}
**Confidence:** {High/Medium/Low} — {reasoning}

{2-3 sentence summary of what this ticket is about}

## Ticket Quality

| Aspect | Status |
|--------|--------|
| Description | {status} |
| Acceptance Criteria | {status} |
| Technical Context | {status} |

**Gaps identified:**
- {gap 1}
- {gap 2}

## Related Items

| Relation | ID | Title |
|----------|:---|:------|
| Parent | #{id} | {title} |
| Related | #{id} | {title} |
| Similar | #{id} | {title} |

## Code Areas

**Files likely affected:**
- `{path/to/file.ts}` — {reasoning}
- `{path/to/file.ts}` — {reasoning}

**Existing implementations:**
- {description of related code}

## Documentation

- {Wiki page}: {relevance}
- {Design doc}: {relevance}

## Suggested Improvements

1. **{suggestion}**: {details}
2. **{suggestion}**: {details}

───────────────────────────────────────────────────────────────────
```

</process>

<confidence_levels>

**High confidence:**
- Clear description and acceptance criteria
- Found related code and documentation
- Similar tickets provide context

**Medium confidence:**
- Some gaps in description or ACs
- Found some related code
- May need clarification on scope

**Low confidence:**
- Vague or missing description
- No clear acceptance criteria
- Can't identify code areas
- Recommend discussion with author

</confidence_levels>

<notes>
- Investigation is read-only (no changes to ticket)
- Use findings to plan implementation
- Share summary with team for context
- Consider updating ticket with findings
</notes>
