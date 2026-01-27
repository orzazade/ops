---
name: ops:config
description: Create or view the ~/.ops/config.yaml configuration file
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Manage ops configuration stored at `~/.ops/config.yaml`. This file contains your Azure DevOps settings, VIP contacts, and preferences.
</objective>

<process>

## Step 1: Check Current Config

```bash
mkdir -p ~/.ops && cat ~/.ops/config.yaml 2>/dev/null || echo "NO_CONFIG"
```

**If NO_CONFIG**: Guide user through setup (Step 2)
**If config exists**: Display it and ask if they want to modify

## Step 2: Gather Config Information

Ask for:
1. **Azure DevOps Organization** (required) - the part after `https://dev.azure.com/`
2. **Default Project** (optional)
3. **VIPs** (optional) - people whose work items should be prioritized

## Step 3: Write Config

Write YAML to `~/.ops/config.yaml`:

```yaml
# Ops Configuration
# See /ops:help for documentation

azure:
  organization: "{org}"      # Required: Your Azure DevOps org
  project: "{project}"       # Default project for queries

user:
  name: "{name}"
  team: "{team}"

# People whose items get priority boost
vips:
  - name: "{vip_name}"
    role: "{vip_role}"

# Priority signals (Claude uses these when reasoning about priorities)
signals:
  - "P1 or P2 priority field"
  - "Blocking other work items"
  - "Has due date approaching"
  - "VIP is author or assigned"
  - "Sprint commitment"
  - "Urgent keywords in comments"
```

</process>

<example>
User: `/ops:config`

Response if no config:
```
No ops config found. Let me help you set one up.

What is your Azure DevOps organization name?
(This is the part after https://dev.azure.com/ in your URL)
```

After gathering info, write the YAML file and confirm:
```
Config saved to ~/.ops/config.yaml

Organization: Appxite
Project: CPQ
VIPs: 2 configured

Run /ops:morning to generate your first briefing.
```
</example>
