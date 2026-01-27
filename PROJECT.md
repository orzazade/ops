# Ops - Work Triage Assistant

> A Claude Code skill package for daily work triage, prioritization, and response drafting.

## Vision

"I wish I had an assistant that tells me what to work on, what to answer, and what the response should be."

Ops is a personal AI work assistant that:
1. **Prioritizes work** - Analyzes all inputs, ranks by importance
2. **Flags responses needed** - Identifies what needs your attention
3. **Drafts responses** - Helps craft appropriate replies
4. **Tracks patterns** - Learns your work style over time

## Core Principles

### 1. Context Engineering First
- Value is in the prompts and context structure, not infrastructure
- Selective gathering (only what's needed)
- Hierarchical compression (summary → details)
- Typed sections (LLM-optimized structure)
- Token budget awareness

### 2. Minimal Infrastructure
- No Docker, no databases, no servers
- File-based state (`.ops/` directory)
- Claude Code + MCP servers only
- Works offline with cached context

### 3. Parallel Agent Architecture
- Spawn researcher agents in parallel for data gathering
- Synthesize results into unified context
- Efficient use of Claude's capabilities

### 4. Global Installation
- Installed in `~/.claude/` for global access
- Works across any project directory
- Skill family: `/ops:*`

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER                                     │
│                    /ops:morning                                 │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   OPS ORCHESTRATOR                              │
│  • Validates config                                             │
│  • Spawns parallel data gatherers                               │
│  • Synthesizes context                                          │
│  • Invokes triage agent                                         │
└─────────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ ADO Researcher  │  │ GSD Researcher  │  │ Email Researcher│
│ (parallel)      │  │ (parallel)      │  │ (parallel)      │
│                 │  │                 │  │                 │
│ • Work items    │  │ • Project state │  │ • Unread emails │
│ • PRs           │  │ • Phase progress│  │ • VIP messages  │
│ • Sprint status │  │ • Blockers      │  │ • Age analysis  │
│ • Comments      │  │ • Tasks         │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
           │                    │                    │
           └────────────────────┼────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CONTEXT SYNTHESIZER                           │
│  • Compresses raw data                                          │
│  • Structures for LLM consumption                               │
│  • Applies token budget                                         │
│  • Adds user memory/preferences                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TRIAGE AGENT                                 │
│  • Applies priority scoring                                     │
│  • Generates actionable briefing                                │
│  • Drafts responses                                             │
│  • Identifies risks                                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OUTPUT                                     │
│  • Morning briefing (markdown)                                  │
│  • Drafted responses                                            │
│  • Persisted to .ops/today/                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Skills (v1.0)

| Skill | Purpose | Priority |
|-------|---------|----------|
| `/ops:morning` | Morning triage briefing | P0 - Core |
| `/ops:status <project>` | Generate status update | P1 |
| `/ops:respond` | Draft response to selected item | P1 |
| `/ops:priorities` | Re-rank priorities mid-day | P2 |
| `/ops:eod` | End-of-day summary | P2 |
| `/ops:config` | Configure Ops settings | P0 - Core |

## Data Sources

### Required
- **Azure DevOps** (via MCP) - Work items, PRs, sprint data
- **Local GSD** (file read) - Project planning state

### Optional (v1.1+)
- **Outlook** (via MCP) - Emails, calendar
- **Teams** (via MCP) - Messages, mentions
- **Gmail** (via MCP) - Personal email

## Context Engineering Specification

### Gathering Rules
1. Only fetch data modified in last 7 days (configurable)
2. Limit to items assigned/created by user
3. Include items where user is mentioned
4. Include blocking/blocked relationships

### Compression Rules
1. Work items: ID, title, state, priority, age, blocked status, last activity
2. PRs: ID, title, author, age, review status, blocking info
3. Emails: From, subject, age, VIP flag, needs response flag
4. GSD: Project name, phase, progress %, remaining tasks, blockers

### Context Structure
```xml
<context type="ops-{skill}" date="{date}" user="{user}">
  <sprint>...</sprint>
  <work_items role="assigned">...</work_items>
  <work_items role="created">...</work_items>
  <pull_requests role="reviewer">...</pull_requests>
  <pull_requests role="author">...</pull_requests>
  <gsd_state project="{project}">...</gsd_state>
  <emails filter="needs_response">...</emails>
  <vip_contacts>...</vip_contacts>
  <yesterday>...</yesterday>
</context>
```

### Token Budget
- Target: 8K tokens for context
- Reserve: 4K tokens for response
- Overflow strategy: Summarize oldest items, drop low priority

## State Management

```
~/.ops/                           # Global ops state
├── config.yaml                   # User configuration
├── memory/
│   ├── vips.yaml                # VIP contacts
│   ├── projects.yaml            # Project contexts
│   └── patterns.yaml            # Learned patterns
└── cache/
    └── last-sync.json           # API cache timestamps

.ops/                             # Per-project state (optional)
├── overrides.yaml               # Project-specific config
└── context/                     # Project-specific context

~/.ops/history/                   # Historical data
├── 2026-01-25/
│   ├── briefing.md
│   ├── responses.md
│   └── context.json             # Raw context for debugging
└── ...
```

## Configuration Schema

```yaml
# ~/.ops/config.yaml

# Required
azure_devops:
  organization: "Appxite"
  default_project: "Orion"

# Optional
user:
  name: "Orkhan Rzazade"
  role: "Tech Lead"
  team: "Integrations and Services"

vips:
  - name: "John Smith"
    role: "VP Engineering"
    priority: highest
  - name: "Sarah Chen"
    role: "Product Owner"
    priority: high

priorities:
  sprint_commitment: +3
  vip_involvement: +3
  blocking_others: +2
  age_over_3_days: +2
  p1_priority: +2
  p2_priority: +1
  carried_over: +1

gsd:
  scan_paths:
    - "~/Projects"
  exclude:
    - "node_modules"
    - ".git"

preferences:
  briefing_length: "concise"  # concise | detailed
  response_style: "professional"  # professional | casual
  timezone: "UTC+4"
```

## Agent Definitions

### ops-orchestrator
- Entry point for all `/ops:*` skills
- Validates configuration
- Spawns researcher agents in parallel
- Waits for results, synthesizes context
- Invokes appropriate action agent

### ops-ado-researcher
- Fetches Azure DevOps data
- Compresses to context format
- Returns structured work item/PR data

### ops-gsd-researcher
- Scans for `.planning/` directories
- Extracts project state
- Returns structured GSD context

### ops-email-researcher (v1.1)
- Fetches email data via MCP
- Identifies VIP senders
- Flags items needing response

### ops-triage-agent
- Receives synthesized context
- Applies priority scoring
- Generates morning briefing
- Drafts responses

### ops-status-agent
- Receives project context
- Generates status report for leadership
- Formats for email/message

## Success Criteria

### v0.1 (MVP)
- [ ] `/ops:morning` produces useful briefing
- [ ] Correctly fetches ADO work items
- [ ] Correctly reads GSD state
- [ ] Prioritization feels accurate
- [ ] Runs in < 30 seconds

### v1.0
- [ ] All P0/P1 skills working
- [ ] Configuration is intuitive
- [ ] Documentation complete
- [ ] Installable via standard method
- [ ] Works on macOS and Linux

### v1.1+
- [ ] Email integration
- [ ] Calendar awareness
- [ ] Pattern learning
- [ ] Team mode (aggregate team status)

## Non-Goals (v1.0)

- Auto-sending responses (always human approval)
- Real-time notifications (batch/on-demand only)
- Mobile app
- Web UI
- Multi-user/team features

## Technical Constraints

- Must work with Claude Code skill system
- Must use MCP for external data
- File-based state only (no databases)
- No Docker dependencies
- Token budget must be respected

## Open Questions

1. How to handle MCP server availability? (graceful degradation)
2. How to install globally? (symlink vs copy)
3. How to update? (git pull vs package manager)
4. How to handle multiple ADO organizations?
5. Should briefing be interactive or static output?
