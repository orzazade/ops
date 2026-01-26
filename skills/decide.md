---
name: ops:decide
description: Get a personalized work recommendation based on priorities and time of day
allowed-tools:
  - Bash
---

<objective>
Generate a personalized recommendation for what to work on next, considering:
- Current priority scores (with manual boost/demote overrides)
- Time of day (deep work vs meeting vs admin hours)
- Work type classification (deep vs meeting vs admin)
- Alternative options when multiple items have similar priority
</objective>

<process>

## Step 1: Execute Decision Workflow

Run the decide CLI to generate the work recommendation:

```bash
cd /Users/orkhanrzazade/Projects/scifi/ops && npx tsx src/scripts/decide-cli.ts 2>&1
```

The CLI will:
- Fetch fresh ADO data (always current - priorities change frequently)
- Apply priority scoring with boost/demote overrides
- Detect current time context (deep/meeting/admin/after-hours)
- Match work types to time context
- Generate recommendation with reasoning
- Output structured XML data

## Step 2: Format Recommendation

Parse the XML output and present the recommendation in a clear, actionable format.

### For `<recommendation>` (normal case):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 WORK RECOMMENDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **I recommend: [item title]**

[Full reasoning narrative from <reasoning>]

**Estimated effort:** [effort.duration] ([effort.reasoning])

**Suggested first action:**
[first_action]

[If alternatives exist:]
**You could also work on:**
- [alternative title] — [summary]
- [alternative title] — [summary]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Formatting guidelines:**
- Use friendly, advisory tone: "I recommend...", "I considered..."
- Emphasize the recommendation with bold and emoji (🎯)
- Present reasoning as natural narrative (no bullet points)
- Show effort estimate prominently
- Frame first action as a call-to-action
- Present alternatives neutrally if they exist

### For `<decision_result type="no-work">`:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 WORK RECOMMENDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 **All caught up!**

No work items or pull requests found that need your attention right now.

This is a great time to:
- Take a break and recharge
- Review your long-term goals
- Help teammates with their work
- Learn something new

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Tone:** Celebrate the accomplishment, suggest constructive options

### For `<decision_result type="low-confidence">`:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 WORK RECOMMENDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ **Low confidence in recommendation**

[reasoning text]

**Top candidate:** [candidate title]

I suggest:
- Review your priority configuration with `/ops:rules`
- Or take a break - it's valid to step away when priorities are unclear

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Tone:** Neutral, present taking a break as a valid option

</process>

<time-awareness>
The recommendation considers your current time context:

- **Deep work mode (8-11am)**: Recommends complex work requiring focused attention
- **Meeting mode (11am-2pm)**: Recommends collaborative work, PR reviews, discussions
- **Admin mode (2-5pm)**: Recommends quick wins, admin tasks, cleanup
- **After-hours**: Flexible recommendations, respects off-hours

The time-fit is reflected in the reasoning (e.g., "Perfect time match: deep work during peak focus hours").
</time-awareness>

<alternatives>
Alternatives are shown when multiple items have similar priority (within 10% score difference).

This helps you make an informed choice if:
- The top recommendation is blocked
- You have specific expertise for an alternative
- You prefer different work based on your energy level
</alternatives>

<examples>

**Example 1: Normal recommendation with alternatives**

User: `/ops:decide`

Response:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 WORK RECOMMENDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **I recommend: Fix critical authentication bug in login flow**

This item scores highest on: P1, VIP assigned. Perfect time match: this is deep work,
and it's deep time (peak focus hours (8-11am) - best for complex work). 2 other items
are similarly urgent if this one is blocked.

**Estimated effort:** Half day or more (Complex work requiring focused attention)

**Suggested first action:**
Start by reviewing the requirements and creating a design outline

**You could also work on:**
- Implement user profile caching — P1, old
- Review payment integration PR from Jane — VIP

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Example 2: No work available**

User: `/ops:decide`

Response:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 WORK RECOMMENDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 **All caught up!**

No work items or pull requests found that need your attention right now.

This is a great time to:
- Take a break and recharge
- Review your long-term goals
- Help teammates with their work
- Learn something new

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Example 3: Low confidence (no priority rules matched)**

User: `/ops:decide`

Response:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 WORK RECOMMENDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ **Low confidence in recommendation**

No priority rules matched for any items. Consider reviewing your priority configuration.

**Top candidate:** Update API documentation

I suggest:
- Review your priority configuration with `/ops:rules`
- Or take a break - it's valid to step away when priorities are unclear

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</examples>

<related-skills>
- `/ops:priorities` - See full priority list with delta visualization
- `/ops:boost <id>` - Temporarily boost an item's priority
- `/ops:demote <id>` - Temporarily demote an item's priority
- `/ops:why <id>` - See detailed score breakdown for an item
- `/ops:rules` - Configure priority rules and weights
</related-skills>

<troubleshooting>

**"AZURE_DEVOPS_PAT not set"**
→ Set the environment variable with your PAT token
→ Required to fetch current ADO data

**"Config required"**
→ Run `/ops:config` first to set up configuration

**"No priority rules matched"**
→ Review priority configuration with `/ops:rules`
→ Ensure rules are configured for your work items
→ Check VIP list, priority keywords, etc.

**Time context seems wrong**
→ Time detection uses local timezone
→ Check system time is correct
→ Deep work: 8-11am, Meeting: 11am-2pm, Admin: 2-5pm

**Recommendation doesn't match my intuition**
→ Use `/ops:why <id>` to see detailed score breakdown
→ Manually boost/demote items with `/ops:boost` or `/ops:demote`
→ Adjust rule weights with `/ops:rules`

</troubleshooting>
