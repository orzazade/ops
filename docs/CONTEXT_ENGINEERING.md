# Context Engineering Specification

> This document defines how Ops gathers, compresses, structures, and presents context to LLMs. This is the core intellectual property of the system.

## Philosophy

**Context engineering is the art of giving an LLM exactly what it needs to make good decisions - no more, no less.**

### The Three Sins of Context

1. **Context Starvation** - Not enough information to make good decisions
2. **Context Flooding** - So much information the signal is lost in noise
3. **Context Chaos** - Unstructured data that's hard for LLM to parse

### The Goal

Achieve **Context Clarity**: The LLM receives well-structured, relevant, compressed information that enables high-quality reasoning with minimal token usage.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     RAW DATA SOURCES                            │
│  Azure DevOps API, GSD Files, Email API, etc.                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: GATHER                              │
│  • Parallel researcher agents                                   │
│  • Source-specific queries                                      │
│  • Raw data retrieval                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 2: FILTER                              │
│  • Relevance filtering (user-assigned, recent, etc.)            │
│  • Deduplication                                                │
│  • Priority pre-scoring                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 3: COMPRESS                            │
│  • Extract essential fields only                                │
│  • Compute derived values (age, blocked status)                 │
│  • Truncate long text (descriptions)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 4: STRUCTURE                           │
│  • Apply typed XML schema                                       │
│  • Group by category                                            │
│  • Order by relevance                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 5: BUDGET                              │
│  • Count tokens                                                 │
│  • Trim if over budget (remove low priority)                    │
│  • Add overflow indicator                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STRUCTURED CONTEXT                           │
│  Ready for LLM consumption                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Gather

### Parallel Execution Strategy

```
Orchestrator
    │
    ├──► spawn(ado-researcher)     ─┐
    ├──► spawn(gsd-researcher)      ├──► await all ──► synthesize
    └──► spawn(email-researcher)   ─┘
```

Each researcher runs independently, fetching from its data source. This reduces latency from serial API calls.

### Researcher Contracts

Each researcher must return a standardized structure:

```typescript
interface ResearcherOutput {
  source: string;           // "azure-devops" | "gsd" | "outlook"
  timestamp: ISO8601;       // When data was fetched
  success: boolean;
  error?: string;           // If success=false
  data: SourceSpecificData;
  metadata: {
    items_fetched: number;
    items_filtered: number;
    api_calls: number;
    duration_ms: number;
  };
}
```

### Azure DevOps Researcher

**Queries to execute:**
1. Work items assigned to me, state in (New, Active, Resolved)
2. Work items created by me, state in (New, Active)
3. PRs where I am a reviewer, status = Active
4. PRs created by me, status = Active
5. Sprint info for my team

**Filter rules:**
- Changed in last 14 days (configurable)
- Exclude closed/removed items
- Include blocked items regardless of age

### GSD Researcher

**Scan strategy:**
1. Read config for scan paths
2. Find all `.planning/` directories
3. For each, read:
   - `PROJECT.md` (project context)
   - `ROADMAP.md` (phase overview)
   - `milestones/*/phases/*/STATE.json` (current progress)
   - `milestones/*/phases/*/PLAN.md` (current tasks)

**Filter rules:**
- Only active phases (status != "complete")
- Projects with activity in last 30 days

### Email Researcher (v1.1)

**Queries to execute:**
1. Unread emails from VIP list
2. Flagged emails
3. Emails where I'm in To (not CC) > 2 days old

**Filter rules:**
- Exclude newsletters, automated notifications
- Prioritize VIP senders
- Group threads (only show latest)

---

## Phase 2: Filter

### Relevance Scoring

Before compression, assign each item a relevance score:

```python
def relevance_score(item):
    score = 0

    # Recency
    if item.age_days <= 1:
        score += 3
    elif item.age_days <= 3:
        score += 2
    elif item.age_days <= 7:
        score += 1

    # Relationship
    if item.assigned_to == me:
        score += 3
    if item.created_by == me:
        score += 2
    if me in item.mentioned:
        score += 2

    # Priority
    if item.priority == "P1":
        score += 3
    elif item.priority == "P2":
        score += 2

    # Blocking
    if item.is_blocking_others:
        score += 3
    if item.is_blocked:
        score += 1

    # VIP involvement
    if item.involves_vip:
        score += 3

    return score
```

### Deduplication

- Same work item from multiple queries → keep once
- PR and linked work item → keep both, note relationship
- Email thread → keep latest only, note thread depth

---

## Phase 3: Compress

### Work Item Compression

**Before (raw API response):**
```json
{
  "id": 12345,
  "rev": 15,
  "fields": {
    "System.Title": "Fix pricing calculation for multi-tier SKUs",
    "System.Description": "<div>When a customer selects multiple pricing tiers for a SKU, the system currently calculates each tier independently and sums them. However, according to the business rules documented in the pricing spec (see wiki/pricing-rules), we should apply a discount factor of 0.95 for each additional tier beyond the first. This bug was reported by the finance team during UAT...</div>",
    "System.AssignedTo": {
      "displayName": "Orkhan Rzazade",
      "uniqueName": "orkhan@appxite.com",
      "id": "uuid-here"
    },
    "System.CreatedDate": "2026-01-20T10:30:00Z",
    "System.ChangedDate": "2026-01-24T15:45:00Z",
    "System.State": "Active",
    "Microsoft.VSTS.Common.Priority": 1,
    "System.Tags": "bug; pricing; p1; sprint-47",
    "System.IterationPath": "Orion\\Sprint 47",
    "System.WorkItemType": "Bug"
  },
  "relations": [...],
  "url": "...",
  "_links": {...}
}
```

**After (compressed):**
```
[BUG-12345] Fix pricing calculation for multi-tier SKUs
Type: Bug | State: Active | Priority: P1
Age: 5d | Last activity: 1d ago | Sprint: 47 (ends Fri)
Assigned: me | Blocked: no | Blocking: 2 items
Tags: pricing, p1
```

### Compression Rules

| Field | Rule |
|-------|------|
| ID | Keep, prefix with type |
| Title | Keep full, max 100 chars |
| Description | Omit (available on demand) |
| Assigned To | "me" or first name |
| Created/Changed | Convert to "Xd ago" |
| State | Keep |
| Priority | Normalize to P1/P2/P3/P4 |
| Tags | Keep top 3 |
| Sprint | Name + days remaining |
| Relationships | Count only (blocking X items) |

### PR Compression

```
[PR-1234] Add caching layer to pricing service
Author: @teammate | Status: waiting for review
Age: 1d | Files: 12 | +450/-120 lines
Blocking: TASK-12400 (teammate's sprint item)
```

### GSD State Compression

```
Project: SKU Builder
Phase: 2 of 4 (API Implementation)
Progress: 45% | Tasks: 3/7 done
Blocker: None
Last activity: 2h ago
```

---

## Phase 4: Structure

### Schema Definition

```xml
<context
  type="ops-morning"
  date="2026-01-25"
  user="orkhan"
  budget_used="6.2K"
  budget_max="8K">

  <!-- High-level summary for quick orientation -->
  <summary>
    <sprint name="47" ends="2026-01-27" days_left="2"/>
    <work_items assigned="6" blocked="1" at_risk="1"/>
    <prs to_review="2" authored="1"/>
    <projects active="2"/>
  </summary>

  <!-- Detailed sections follow, ordered by actionability -->

  <section type="response_needed" count="3">
    <!-- Items that need a response/action from user -->
    <item source="ado-pr" id="1234" priority="high" age="1d">
      PR review blocking teammate: Add caching layer
    </item>
    <item source="email" id="abc" priority="high" age="2d" vip="true">
      From: VP Engineering - Re: SKU Builder status
    </item>
    ...
  </section>

  <section type="work_items_assigned" count="6">
    <item id="BUG-12345" type="bug" priority="P1" state="Active" age="5d">
      Fix pricing calculation for multi-tier SKUs
      <meta>Sprint commitment, at risk - no progress 2d</meta>
    </item>
    <item id="TASK-12400" type="task" priority="P2" state="Active" age="2d" blocked="true">
      Implement new discount rules
      <meta>Blocked by: API design decision</meta>
    </item>
    ...
  </section>

  <section type="prs_to_review" count="2">
    <item id="PR-1234" author="teammate" age="1d" status="waiting">
      Add caching layer to pricing service
      <meta>Blocking teammate's sprint item</meta>
    </item>
    ...
  </section>

  <section type="prs_authored" count="1">
    <item id="PR-1240" age="3d" status="approved" reviewers="2/2">
      Refactor pricing module
      <meta>Ready to merge</meta>
    </item>
  </section>

  <section type="gsd_projects" count="2">
    <project name="SKU Builder" phase="2/4" progress="45%">
      API Implementation - 3 tasks remaining
    </project>
    <project name="CPQ Integration" phase="1/3" progress="80%">
      Data Modeling - 1 task remaining, blocked
    </project>
  </section>

  <section type="yesterday" planned="5" completed="3">
    <carryover id="BUG-12345">No progress</carryover>
    <carryover id="PR-1234">Not reviewed</carryover>
  </section>

  <section type="vips">
    <contact name="John Smith" role="VP Engineering" priority="highest"/>
    <contact name="Sarah Chen" role="Product Owner" priority="high"/>
  </section>

</context>
```

### Section Ordering

1. **response_needed** - Most actionable, requires immediate attention
2. **work_items_assigned** - Core work
3. **prs_to_review** - Unblocking others
4. **prs_authored** - Tracking own PRs
5. **gsd_projects** - Project-level view
6. **yesterday** - Continuity context
7. **vips** - Reference for priority decisions

### Priority Within Sections

Items sorted by:
1. Priority score (descending)
2. Age (descending, older = more urgent)
3. Blocked status (blocked items last, they can't progress)

---

## Phase 5: Budget

### Token Counting

Use tiktoken (cl100k_base) for accurate counts:

```python
def count_tokens(text: str) -> int:
    encoding = tiktoken.get_encoding("cl100k_base")
    return len(encoding.encode(text))
```

### Budget Allocation

| Component | Budget |
|-----------|--------|
| System prompt | ~1K |
| Context | 8K target, 10K max |
| Response | 4K reserved |
| **Total** | ~15K |

### Overflow Strategy

If context exceeds budget:

1. **Summarize sections** - "6 more work items (P2-P4, not shown)"
2. **Drop low priority items** - Starting from bottom of each section
3. **Truncate metadata** - Keep essential fields only
4. **Add overflow indicator** - Let LLM know context is incomplete

```xml
<section type="work_items_assigned" count="6" showing="4" overflow="2">
  ...
  <overflow>2 additional P3/P4 items not shown</overflow>
</section>
```

---

## Prompt Engineering

### System Prompt Structure

```markdown
<system>
You are Ops, a work triage assistant.

## Your Role
Analyze the provided context and help the user prioritize their work day.

## Context Format
You will receive structured context in XML format with these sections:
- summary: Quick stats overview
- response_needed: Items requiring response today
- work_items_assigned: User's assigned work
- prs_to_review: Pull requests awaiting review
- prs_authored: User's own pull requests
- gsd_projects: Local project status
- yesterday: What was planned vs completed
- vips: Important contacts

## Priority Scoring
Apply these weights when ranking:
- VIP involvement: +3
- Sprint commitment at risk: +3
- Blocking others: +2
- No progress > 2 days: +2
- P1 priority: +2
- P2 priority: +1
- Carried over from yesterday: +1

## Output Format
Produce a briefing with:
1. 🔴 RESPOND NOW (max 3) - Items needing response with draft
2. 🎯 FOCUS TODAY (max 5) - Ranked work items with reasoning
3. ⚠️ RISKS - What could go wrong if ignored
4. 📋 LATER - What can safely wait

Be specific. Be actionable. Reference item IDs.
</system>
```

### User Prompt

```markdown
Generate my morning briefing for {date}.

{context}

Additional notes from user: {user_notes}
```

---

## Caching Strategy

### What to Cache

| Data | TTL | Reason |
|------|-----|--------|
| Work items | 15 min | Reduces API calls during iteration |
| Sprint info | 1 hour | Rarely changes |
| GSD state | 5 min | Local files, cheap to read |
| VIP list | Until changed | Static config |

### Cache Location

```
~/.ops/cache/
├── ado-work-items.json
├── ado-prs.json
├── ado-sprint.json
├── gsd-projects.json
└── cache-meta.json   # Timestamps, TTLs
```

### Cache Invalidation

- Manual: `/ops:refresh` forces fresh fetch
- Automatic: On TTL expiry
- Smart: If user just created/updated something

---

## Extensibility

### Adding a New Data Source

1. Create new researcher agent in `agents/`
2. Implement `ResearcherOutput` interface
3. Add compression rules to `prompts/compression/`
4. Add section schema to context structure
5. Update system prompt to explain new section

### Customizing Priority Scoring

Users can override in config:

```yaml
priorities:
  vip_involvement: 5      # Increased from default 3
  sprint_commitment: 2    # Decreased from default 3
  custom_tag_urgent: 4    # Custom rule
```

---

## Metrics & Debugging

### Context Quality Metrics

Track and log:
- Token count per section
- Compression ratio (raw vs compressed)
- Items filtered vs included
- Priority score distribution

### Debug Mode

`/ops:morning --debug` outputs:
- Raw data before compression
- Token counts per section
- Priority scores for all items
- Full context as sent to LLM
