---
name: ops:respond
description: Draft responses for briefing items with tone adaptation
allowed-tools:
  - Read
  - mcp__azure-devops__wit_get_work_item
  - mcp__azure-devops__wit_list_work_item_comments
  - mcp__azure-devops__repo_get_pull_request_by_id
  - mcp__azure-devops__repo_list_pull_request_threads
---

<objective>
Help draft professional responses for work items or pull requests.

Provides 2-3 distinct response options with appropriate tone (formal for VIPs, conversational for peers).
</objective>

<process>

## Step 1: Parse Item Reference

Extract the item reference from the user's command:

- By ID: "/ops:respond #123" or "/ops:respond 123"
- By PR: "/ops:respond PR 456"

## Step 2: Load Config

```
Read ~/.ops/config.yaml
```

Get organization, project, and VIP list.

## Step 3: Fetch Item Details

**For Work Item:**
```
mcp__azure-devops__wit_get_work_item(
  id: {id},
  project: "{project}",
  expand: "relations"
)
```

Also fetch recent comments:
```
mcp__azure-devops__wit_list_work_item_comments(
  project: "{project}",
  workItemId: {id},
  top: 10
)
```

**For Pull Request:**
```
mcp__azure-devops__repo_get_pull_request_by_id(
  project: "{project}",
  pullRequestId: {id}
)

mcp__azure-devops__repo_list_pull_request_threads(
  project: "{project}",
  pullRequestId: {id}
)
```

## Step 4: Analyze Context

From the item and comments, determine:

- **Recipient**: Who needs the response?
- **VIP Check**: Is recipient in VIP list from config?
- **Situation**: What's being asked or discussed?
- **Tone Required**: Formal (VIP) or Conversational (peer)?
- **Response Type**: Status update, answer, action commitment, clarification?

## Step 5: Generate Response Options

Create 2-3 distinct response options:

**Option 1: Direct/Concise**
- Get to the point quickly
- Best for busy recipients or simple questions

**Option 2: Detailed/Thorough**
- Provide context and explanation
- Best when clarification needed

**Option 3: Action-Oriented** (if applicable)
- Focus on next steps and commitments
- Best when action is expected

For each option, adapt tone based on recipient:
- **VIP**: Formal, respectful, concise
- **Peer**: Conversational, collaborative

## Step 6: Present Options

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RESPONSE OPTIONS — {item title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Summary:** {situation summary}
**Recipient:** {name} {VIP: {role} | peer}

## Option 1: {Label} ({tone})

{response text - complete and ready to send}

> Why this works: {rationale}

## Option 2: {Label} ({tone})

{response text - complete and ready to send}

> Why this works: {rationale}

## Option 3: {Label} ({tone})

{response text - complete and ready to send}

> Why this works: {rationale}

───────────────────────────────────────────────────────────────────
```

</process>

<tone_guidelines>

**For VIPs:**
- Use full sentences, no abbreviations
- Be respectful of their time
- Lead with the key information
- Avoid technical jargon unless appropriate
- End with clear next steps if action needed

**For Peers:**
- Can be more casual and direct
- OK to use team jargon and abbreviations
- Can ask clarifying questions inline
- More collaborative tone

</tone_guidelines>

<notes>
- Each option should be distinct in approach, not just wording
- Include full response text (user can copy directly)
- Explain why each option works for the situation
- If user wants adjustments, modify based on their feedback
</notes>
