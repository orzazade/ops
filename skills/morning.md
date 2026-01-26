---
name: ops:morning
description: Generate your morning work briefing from Azure DevOps and GSD projects
allowed-tools:
  - Bash
  - Read
---

<objective>
Generate a prioritized morning briefing by gathering data from Azure DevOps (work items, PRs) and GSD projects, then producing a summary of top priorities and items needing response.
</objective>

<process>

## Step 1: Gather Data

Run the morning CLI to gather and score work data:

```bash
cd /Users/orkhanrzazade/Projects/scifi/ops && npx tsx src/scripts/morning-cli.ts 2>&1
```

This will output:
- Scored items from Azure DevOps (work items, PRs)
- Context from GSD projects
- Yesterday's briefing summary if available
- Data quality tier (1=best, 5=worst)

## Step 2: Generate Briefing

Analyze the `<morning-data>` output and generate a briefing with:

1. **Summary** (2-3 sentences): Overview of your day's priorities based on the scored items

2. **Top 5 Priorities**: Select the 5 highest-scored items. For each:
   - Title and type (work_item or pull_request)
   - Score hint showing top applied rules (e.g., "P1+VIP", "VIP+blocking")
   - Why it's a priority (based on applied rules like vip_involvement, p1_priority)
   - Suggested action

3. **Items Needing Response** (up to 3): Items where you need to respond or act. Draft a suggested response for each.

4. **Blockers/Risks**: Any concerning patterns (overdue items, blocked work, etc.)

5. **Carryover**: If yesterday's data exists, note items that carried over

## Step 3: Format Output

Present the briefing in this format:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 MORNING BRIEFING — [date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Summary
[2-3 sentence overview]

## Top Priorities

1. **[Title]** (work_item/pull_request) _(P1+VIP)_
   - Priority reason: [why from rules]
   - Action: [what to do]

2. ...

## Needs Response

1. **[Title]**
   - Suggested response: [draft]

## Blockers & Risks
- [any blockers or risks identified]

───────────────────────────────────────────────────────────────────
Data quality: Tier [N]/5 | Generated: [timestamp]
───────────────────────────────────────────────────────────────────
```

</process>

<scoring-rules>
Items are scored based on these rules (higher = more urgent):
- **p1_priority**: Priority 1 work items (critical)
- **p2_priority**: Priority 2 work items (high)
- **vip_involvement**: Assigned to or from VIP contacts
- **Score hints**: Each item shows abbreviated applied rules (e.g., P1+VIP, VIP+blocking)
- Items are sorted by score descending
- Run `/ops:why <id>` for detailed score breakdown
</scoring-rules>

<troubleshooting>
- **"AZURE_DEVOPS_PAT not set"**: Set the environment variable with your PAT token
- **"Config required"**: Run `/ops:config` first to set up configuration
- **Tier 5 (no data)**: Check network connection and credentials
- **Build errors**: Run `npm run build` in the ops directory first
</troubleshooting>
