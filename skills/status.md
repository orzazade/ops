---
name: ops:status
description: Generate project status report for leadership
allowed-tools:
  - Bash
  - Read
---

<objective>
Generate a leadership-ready status report for a specific project by gathering data from Azure DevOps and GSD projects.
</objective>

<process>

## Step 1: Extract Project Name

Get the project name from the user's command:
- "/ops:status CPQ" -> project = "CPQ"
- "/ops:status sku-builder" -> project = "sku-builder"
- If no project specified, ask user which project they want status for.

## Step 2: Gather Project Data

Run the status CLI:
```bash
cd /Users/orkhanrzazade/Projects/scifi/ops && npx tsx src/scripts/status-cli.ts --project="<PROJECT_NAME>" 2>&1
```

This outputs:
- Filtered work items and PRs for the project
- GSD project planning data
- Data quality tier (1=best, 4=worst)

## Step 3: Generate Status Report

Analyze the `<status-data>` output and generate a report with:

1. **Executive Summary** (2-3 sentences): High-level project health assessment

2. **Overall Status**: One of: ON-TRACK, AT-RISK, DELAYED, BLOCKED

3. **Key Highlights** (3-5 bullets): Recent achievements and progress

4. **Risks** (if any): Each with severity (low/medium/high/critical) and mitigation

5. **Blockers** (if any): What's blocking progress and action needed

6. **Next Steps** (3-5 bullets): Upcoming priorities

7. **Metrics** (if available):
   - Work items completed vs in-progress
   - PRs merged vs pending review

## Step 4: Format Output

Default output format is markdown. User can request:
- **--format=email**: HTML suitable for Outlook/Gmail
- **--format=slack**: Slack mrkdwn format

Markdown format:
```
# Project Status: [Project Name]
**Date:** [date]
**Overall Status:** [ON-TRACK/AT-RISK/DELAYED/BLOCKED]

## Executive Summary
[2-3 sentences]

## Key Highlights
- [achievement 1]
- [achievement 2]

## Risks
| Risk | Severity | Mitigation |
|------|----------|------------|
| ... | ... | ... |

## Blockers
- **[blocker]**: [action needed]

## Next Steps
- [ ] [priority 1]
- [ ] [priority 2]

## Metrics
- Work items: X completed, Y in progress
- Pull requests: X merged, Y pending

---
*Data quality: Tier N/4 | Generated: [timestamp]*
```

Email format: Use inline CSS, no external styles. Suitable for Outlook/Gmail.

Slack format: Use Slack mrkdwn (*bold*, _italic_, `code`).

</process>

<troubleshooting>
- **"AZURE_DEVOPS_PAT not set"**: Set the environment variable with your PAT token
- **"Config required"**: Run `/ops:config` first to set up configuration
- **"No project specified"**: Include project name: /ops:status CPQ
- **Tier 4 (no data)**: Project name may not match ADO/GSD naming. Try variations.
- **Empty results**: Check if work items are assigned to correct project in ADO
</troubleshooting>
