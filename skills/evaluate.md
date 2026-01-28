---
name: ops:evaluate
description: Probation period evaluation from ADO history
allowed-tools:
  - Read
  - mcp__azure-devops__search_workitem
  - mcp__azure-devops__wit_get_work_item
---

<objective>
Generate probation period evaluation by analyzing employee's Azure DevOps work history.

Output: Professional evaluation email ready to send.
</objective>

<input>
Employee name: $ARGUMENTS
</input>

<process>

## Step 1: Load Config

```
Read ~/.ops/config.yaml
```

Get organization and project.

## Step 2: Search Work Items

```
mcp__azure-devops__search_workitem(
  searchText: "{employee_name}",
  top: 100
)
```

Filter to:
- Features, User Stories, Bugs only
- Exclude Tasks
- Organization: from config

## Step 3: Analyze Results

**Compile statistics:**

| Metric | Value |
|--------|-------|
| Total work items | {count} |
| Features owned | {count} |
| User Stories | {count} |
| Bugs fixed/reported | {count} |

**Breakdown by involvement:**
- Directly assigned to them
- Created for others
- Mentioned/involved

**Status breakdown:**
- Closed
- Active
- In Progress

## Step 4: Identify Accomplishments

Extract:
- Major features/stories they owned
- Bugs they discovered or fixed
- Initiative shown (stories created for team)
- Collaboration patterns

## Step 5: Generate Email

</process>

<output>
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PROBATION EVALUATION: {Employee Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Work Item Summary

| Type | Count |
|------|------:|
| Features | {X} |
| User Stories | {Y} |
| Bugs | {Z} |
| **Total** | {N} |

## Key Accomplishments

1. {accomplishment with #ID}
2. {accomplishment with #ID}
3. {accomplishment with #ID}

───────────────────────────────────────────────────────────────────

## Email Draft

Subject: Re: Probation Evaluation - {Employee Name}

---

Hi Yulia, Hi {First Name},

Thank you for scheduling the probation evaluation meeting. Please find
below my summary of {First Name}'s contributions and performance during
the probation period.

**Overview**

{Employee} has been involved in {N} work items:
- {X} Features
- {Y} User Stories
- {Z} Bugs

**Key Accomplishments**

- {Accomplishment 1} (#{ID})
- {Accomplishment 2} (#{ID})
- {Accomplishment 3} (#{ID})
- {Accomplishment 4} (#{ID})

**What Went Well**

- {Positive observation 1}
- {Positive observation 2}
- {Positive observation 3}
- {Positive observation 4}

**Areas for Discussion**

- {Active/in-progress work items}
- {Any concerns or growth areas}

**Goals for Next Period**

1. Increase usage of AI agents and tools in daily development workflow
2. {Project ownership goal based on work area}
3. {Additional growth goal}

Looking forward to the meeting.

Best regards,
{Your name from config}

───────────────────────────────────────────────────────────────────
```
</output>

<rules>
- Focus on Features, User Stories, Bugs only
- Exclude Tasks from summary
- Include work item IDs for reference
- Keep email professional and concise
- Always include AI tools goal in Goals for Next Period
</rules>
