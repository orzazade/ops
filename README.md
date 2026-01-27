<div align="center">

```
   ____  _____   _____
  / __ \|  __ \ / ____|
 | |  | | |__) | (___
 | |  | |  ___/ \___ \
 | |__| | |     ____) |
  \____/|_|    |_____/

  AI-Powered DevOps Assistant
```

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Ops** is a skill system for [Claude Code](https://claude.ai/claude-code) that provides AI-powered morning briefings, priority scoring, and work management for Azure DevOps users.

**Pure markdown. No build step. No dependencies.**

[Commands](#commands) • [Installation](#installation) • [Quick Start](#quick-start)

</div>

---

## Why Ops?

Start your day knowing exactly what to focus on:

```
/ops:morning
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 MORNING BRIEFING — 2026-01-27
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Top Priorities

| # | Type | ID | Title | State | Score | Reason |
|---|------|-----|-------|-------|------:|--------|
| 1 | Bug | #12345 | Fix auth timeout | Active | 85 | P1, blocking |
| 2 | Task | #12346 | Review Jane's PR | New | 70 | VIP waiting |
| 3 | Story | #12347 | Add caching | Active | 65 | Sprint |
```

## Commands

### Daily Workflow

| Command | Description |
|---------|-------------|
| `/ops:morning` | Start of day briefing with top 10 priorities |
| `/ops:priorities` | Refresh priorities, see what changed |
| `/ops:eod` | End of day wrap-up with accomplishments |

### Priority Management

| Command | Description |
|---------|-------------|
| `/ops:boost <id>` | Temporarily increase item priority |
| `/ops:demote <id>` | Temporarily decrease item priority |
| `/ops:why <id>` | Explain why item has its score |
| `/ops:rules` | View/edit scoring weights |

### Deep Work

| Command | Description |
|---------|-------------|
| `/ops:research <id>` | Deep dive with parallel research (code + web + ADO) |

### Management

| Command | Description |
|---------|-------------|
| `/ops:sprint` | Sprint capacity management |
| `/ops:status <project>` | Project status report for leadership |

### Setup

| Command | Description |
|---------|-------------|
| `/ops:config` | Configure Azure DevOps connection |

## Installation

```bash
# Clone
git clone https://github.com/orzazade/ops.git
cd ops

# Install skills to Claude Code
./install.sh
```

That's it. No npm, no build, no dependencies.

### Requirements

- **Claude Code** with Azure DevOps MCP server configured
- **Azure DevOps** PAT token (set in MCP config)

## Quick Start

### 1. Configure

```
/ops:config
```

Creates `~/.ops/config.yaml`:

```yaml
azure:
  organization: YourOrg
  project: YourProject

user:
  name: Your Name
  team: Your Team

vips:
  - name: Your Manager
    role: Engineering Manager
```

### 2. Run Morning Briefing

```
/ops:morning
```

## Architecture

```
ops/
├── skills/           # Claude Code commands (user invokes these)
│   ├── config.md
│   ├── morning.md
│   ├── priorities.md
│   ├── eod.md
│   ├── boost.md
│   ├── demote.md
│   ├── why.md
│   ├── rules.md
│   ├── research.md   # Parallel: code + web + ADO search
│   ├── sprint.md
│   └── status.md
│
├── agents/           # Specialized workers (spawned by skills)
│   └── ...
│
└── install.sh        # Copy skills to ~/.claude/commands/ops/
```

### Key Design Decisions

1. **Pure markdown** - Skills are prompts, not code
2. **MCP for data** - Azure DevOps MCP server handles API calls
3. **Claude for reasoning** - No separate LLM API calls
4. **Parallel research** - Task() spawns multiple agents simultaneously
5. **Simple state** - YAML files in `~/.ops/`

### GSD Patterns Applied

- Parallel Task() spawning for faster research
- Synthesize after parallel completes
- Brutal assessment (challenge approaches)
- Web research for best practices

## Priority Scoring

| Signal | Weight |
|--------|-------:|
| P1 Priority | +30 |
| Overdue | +25 |
| VIP involved | +25 |
| Blocking others | +20 |
| P2 Priority | +20 |
| Due soon (3 days) | +15 |
| Sprint commitment | +15 |
| Age > 5 days | +10 |

Customize with `/ops:rules`.

## License

MIT - see [LICENSE](LICENSE)

---

<div align="center">

**Pure markdown skills for Claude Code**

</div>
