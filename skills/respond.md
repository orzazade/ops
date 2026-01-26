---
name: ops:respond
description: Draft responses for briefing items with tone adaptation
allowed-tools:
  - Bash
  - Read
---

<objective>
Help draft professional responses for work items or pull requests from your briefing.

Provides 2-3 distinct response options with appropriate tone (formal for VIPs, conversational for peers).
</objective>

<process>

## Step 1: Extract Item Reference

Parse the user's request to identify the briefing item:

- By ID: "/ops:respond #123" or "/ops:respond 123"
- By keyword: "/ops:respond review PR" or "/ops:respond Jane's PR"

If the identifier is ambiguous, ask the user to clarify.

## Step 2: Generate Response Options

Run the respond CLI to generate response drafts:

```bash
cd /Users/orkhanrzazade/Projects/scifi/ops && \
  npx tsx src/scripts/respond-cli.ts --item="<IDENTIFIER>" 2>&1
```

The CLI will:
- Load today's briefing (falls back to yesterday if needed)
- Find the matching item by ID or title keyword
- Detect VIP recipients and adapt tone accordingly
- Generate 2-3 distinct response options via Claude AI
- Output structured XML data

## Step 3: Present Response Options

Parse the XML output and format it as follows:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RESPONSE OPTIONS — [item title]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary: [situation summary]
Recipient: [name] ([VIP: role] or [peer])

## Option 1: [Label] ([tone])

[response text - complete and ready to send]

> Why this works: [rationale]

## Option 2: [Label] ([tone])

[response text - complete and ready to send]

> Why this works: [rationale]

[... Option 3 if present ...]

---
Context factors: [notes joined by ", "]
---
```

**Format notes:**
- Use the separator lines for visual clarity
- Show recipient type clearly (VIP with role or peer)
- Each option should be distinct in approach/style
- Include full response text (user can copy directly)
- Explain why each option works

## Step 4: Iterate if Needed

If the user wants adjustments:
- Different tone (more/less formal)
- Different length (brief/detailed)
- Different focus (action-oriented, status update, question)

Simply acknowledge and re-run the CLI if needed, or manually adjust based on the generated options.

</process>

<troubleshooting>

**"No briefing data available"**
→ Run `/ops:morning` first to generate a briefing

**"Item not found: [identifier]"**
→ Check the available items list in the error message
→ Use exact ID (#123) or a more specific keyword

**"ANTHROPIC_API_KEY not set"**
→ Set the environment variable: `export ANTHROPIC_API_KEY=<your-key>`

**"Config required"**
→ Run `/ops:config` to set up your configuration

**Empty recipient or "Team"**
→ No specific recipient detected in the item
→ Use generic team communication tone

**No VIP detected when expected**
→ Check config VIPs list spelling
→ VIP matching uses partial case-insensitive matching

</troubleshooting>
