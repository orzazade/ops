---
name: ops:rules
description: View or edit scoring rules
allowed-tools:
  - Read
  - Write
  - AskUserQuestion
---

<objective>
View current priority scoring rules or interactively edit weight values.
</objective>

<process>

## Step 1: Determine Mode

- "/ops:rules" -> View mode
- "/ops:rules --edit" or "/ops:rules edit" -> Edit mode

## Step 2: Load Current Rules

```
Read ~/.ops/rules.json
```

If file doesn't exist, use defaults:

```json
{
  "weights": {
    "p1_priority": 30,
    "p2_priority": 20,
    "vip_involved": 25,
    "blocking_others": 20,
    "due_soon": 15,
    "overdue": 25,
    "sprint_commitment": 15,
    "item_age": 10
  },
  "thresholds": {
    "due_soon_days": 3,
    "old_item_days": 5
  }
}
```

## Step 3: View Mode

Present current rules:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PRIORITY SCORING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Signal Weights

| Signal | Weight | Description |
|--------|-------:|-------------|
| P1 Priority | +{N} | Work item marked as Priority 1 |
| P2 Priority | +{N} | Work item marked as Priority 2 |
| VIP Involved | +{N} | Assigned to or from VIP contact |
| Blocking Others | +{N} | Has "blocks" relationships |
| Due Soon | +{N} | Due within {threshold} days |
| Overdue | +{N} | Past due date |
| Sprint Commitment | +{N} | In current sprint iteration |
| Item Age | +{N} | Older than {threshold} days |

## Thresholds

| Setting | Value |
|---------|------:|
| Due soon | {N} days |
| Old item | {N} days |

## Overrides

| Type | Effect |
|------|-------:|
| Boost | +50 |
| Demote | -30 |

───────────────────────────────────────────────────────────────────
Run `/ops:rules --edit` to modify weights
───────────────────────────────────────────────────────────────────
```

## Step 4: Edit Mode

Use AskUserQuestion to get which weight to change:

```
Which rule would you like to modify?
```

Options:
- P1 Priority (current: {N})
- P2 Priority (current: {N})
- VIP Involved (current: {N})
- Blocking Others (current: {N})
- Due Soon (current: {N})
- Overdue (current: {N})
- Sprint Commitment (current: {N})
- Item Age (current: {N})
- Reset to defaults

Then ask for new value:

```
Enter new weight for {rule} (current: {N}):
```

## Step 5: Save Changes

Write updated rules:

```
Write ~/.ops/rules.json
```

Confirm:

```
✓ Updated {rule}: {old} → {new}

Changes take effect immediately for future priority calculations.
```

</process>

<default_weights>

| Signal | Default | Reasoning |
|--------|--------:|-----------|
| P1 Priority | 30 | Critical work, highest base weight |
| P2 Priority | 20 | Important but not critical |
| VIP Involved | 25 | Organizational visibility matters |
| Blocking Others | 20 | Unblocking creates cascading value |
| Due Soon | 15 | Time pressure increases urgency |
| Overdue | 25 | Past due needs immediate attention |
| Sprint Commitment | 15 | Team commitments should be honored |
| Item Age | 10 | Old items risk being forgotten |

</default_weights>

<notes>
- Changes take effect immediately
- Reset to defaults removes custom rules.json
- Weights are additive (item can have multiple signals)
- Maximum practical score ~100-150 with multiple signals
</notes>
