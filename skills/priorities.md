---
name: ops:priorities
description: Re-rank your priorities throughout the day with delta visualization
allowed-tools:
  - Bash
  - Read
---

<objective>
Show your current priorities with visual indicators for what's new, completed, or changed since your morning briefing.

Supports pinning important items to keep them at the top regardless of automated re-ranking.
</objective>

<process>

## Step 1: Execute Priorities Workflow

Run the priorities CLI to generate the re-ranked priority list:

```bash
cd /Users/orkhanrzazade/Projects/scifi/ops && npx tsx src/scripts/priorities-cli.ts 2>&1
```

The CLI will:
- Load today's morning briefing as baseline (or bootstrap if missing)
- Gather current ADO data
- Calculate delta (new, completed, changed items)
- Re-score items with recent activity
- Apply pins (pinned items first)
- Output structured XML data

## Step 2: Format Priority List with Visual Markers

Parse the XML output and format it with visual indicators:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 YOUR PRIORITIES — [time since baseline]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Baseline: [source] ([timestamp])
Delta: [+N new] [↑N changed] [-N completed] [→N unchanged]
Pins: [N pinned]

[For each priority item:]

[N]. [📌 if pinned][🆕 if new][✅ if completed][↑ if changed] [Title] _(P1+VIP)_
    ID: #[id] | Type: [work_item/pull_request]
    Priority: [reason]

[End of list]

---
Legend:
📌 Pinned  |  🆕 New since morning  |  ↑ Changed  |  ✅ Completed  |  → Unchanged
---
```

**Visual markers based on delta:**
- **🆕 NEW**: Items that appeared in current priorities but not in morning baseline
- **↑ CHANGED**: Items that were in morning baseline but priority reason changed
- **✅ DONE**: Items from morning baseline that are no longer in current priorities (show these at the end with strikethrough)
- **→ UNCHANGED**: Items with same priority reason as morning (no special marker needed)
- **📌 PINNED**: Items pinned by user (always appear first)

**Color formatting:**
- Use **bold** for pinned items
- Use green text for new items (🆕)
- Use yellow text for changed items (↑)
- Use gray strikethrough for completed items (✅)

**Sort order:**
1. Pinned items first (in priority order)
2. Unpinned items (in priority order)
3. Completed items at the end (strikethrough)

## Step 3: Pin Management (Optional)

If the user wants to pin or unpin an item:

**To pin an item:**
```bash
cd /Users/orkhanrzazade/Projects/scifi/ops && \
  npx tsx src/scripts/priorities-cli.ts --pin=[id] [--type=work_item|pull_request] 2>&1
```

**To unpin an item:**
```bash
cd /Users/orkhanrzazade/Projects/scifi/ops && \
  npx tsx src/scripts/priorities-cli.ts --unpin=[id] [--type=work_item|pull_request] 2>&1
```

**Notes:**
- Default type is `work_item` (can omit `--type` for work items)
- For pull requests, specify `--type=pull_request`
- After pinning/unpinning, re-run `/ops:priorities` to see updated list

## Step 4: Explain Changes (If Requested)

If the user asks "what changed?", focus on the delta summary:
- Highlight new items with full context
- Explain what caused priority changes
- Note completed items as achievements
- Use `/ops:why <id>` to show detailed score breakdown for specific items

</process>

<score-hints>
Each priority item shows a score hint in parentheses (e.g., "P1+VIP", "VIP+blocking") indicating the top scoring rules that apply.

To see full score breakdown for any item: `/ops:why <id>`
</score-hints>

<examples>

**Example 1: First run of the day (bootstrap)**

User: `/ops:priorities`

Response:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 YOUR PRIORITIES — just now
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Baseline: bootstrap (2026-01-26T12:05:00Z)
Delta: Fresh priorities generated
Pins: 0 pinned

1. Fix critical authentication bug in login flow _(P1+VIP)_
   ID: #1234 | Type: work_item
   Priority: P1 work item with VIP involvement

2. Review payment integration PR from Jane _(VIP)_
   ID: #567 | Type: pull_request
   Priority: Pull request by VIP Jane

[...]

---
Note: No morning briefing found - generated fresh priorities as bootstrap
---
```

**Example 2: Afternoon update with delta**

User: `/ops:priorities`

Response:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 YOUR PRIORITIES — 5 hours ago
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Baseline: today (2026-01-26T07:30:00Z)
Delta: +2 new | ↑1 changed | -1 completed | →1 unchanged
Pins: 1 pinned

1. **📌 Fix critical authentication bug in login flow** _(P1+VIP)_
   ID: #1234 | Type: work_item
   Priority: P1 work item with VIP involvement

2. 🆕 Urgent deployment blocker - API timeout _(P1)_
   ID: #1235 | Type: work_item
   Priority: P1 work item

3. ↑ Review payment integration PR from Jane _(VIP)_
   ID: #567 | Type: pull_request
   Priority: Pull request by VIP Jane (previously: Pull request review)

4. → Update documentation for new API _(P2)_
   ID: #890 | Type: work_item
   Priority: Documentation task

✅ ~~Database migration script~~ (completed)
   ID: #1233 | Type: work_item

---
Legend:
📌 Pinned  |  🆕 New since morning  |  ↑ Changed  |  ✅ Completed  |  → Unchanged
---
```

**Example 3: Pinning an item**

User: `/ops:priorities --pin 1234`

Response:
```
✓ Pinned work item #1234: Fix critical authentication bug in login flow

Run /ops:priorities to see updated list.
```

</examples>

<troubleshooting>

**"No morning baseline found - generated fresh priorities as bootstrap"**
→ Normal on first run of the day or if morning briefing wasn't generated
→ The current priorities become the baseline for future delta calculations

**"AZURE_DEVOPS_PAT not set"**
→ Set the environment variable with your PAT token
→ Required to fetch current ADO data

**"Config required"**
→ Run `/ops:config` first to set up configuration

**"work_item [id] not found in current priorities"**
→ Item may have been completed or deprioritized
→ Run `/ops:priorities` to see available items before pinning

**Empty priority list**
→ No work items or PRs found in ADO
→ Check if you're assigned to any items or have open PRs

**Stale baseline**
→ Briefing from a previous day is not used
→ Fresh baseline generated automatically (bootstrap pattern)

</troubleshooting>
