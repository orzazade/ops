---
name: ops:morning
description: Generate your morning work briefing from Azure DevOps and GSD projects
allowed-tools:
  - Bash
  - Read
---

<objective>
Generate a prioritized morning briefing by gathering data from Azure DevOps (work items, PRs) and GSD projects, then producing a Claude-powered summary of top priorities and items needing response.
</objective>

<execution>
Run the morning workflow CLI to generate your briefing:

```bash
cd /path/to/ops && npx tsx src/scripts/morning-cli.ts
```

The briefing will show:
- Summary of your day's priorities
- Top 5 focus items ranked by urgency/importance
- Items needing your response (with suggested responses)
- Any blockers identified
- Carryover comparison from yesterday

**First time setup:** If you haven't configured ops yet, run `/ops:config` first to set up your Azure DevOps connection.
</execution>

<troubleshooting>
- **"Config required"**: Run `/ops:config` to set up your configuration
- **"No data available"**: Check your Azure DevOps PAT token and network connection
- **Partial data warnings**: Some data sources unavailable, briefing shows available data
- **Build errors**: Run `npm run build` in the ops directory
</troubleshooting>
