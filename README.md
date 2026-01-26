<div align="center">

```
   ____  _____   _____
  / __ \|  __ \ / ____|
 | |  | | |__) | (___
 | |  | |  ___/ \___ \
 | |__| | |     ____) |
  \____/|_|    |_____/

  Your AI-Powered DevOps Assistant
```

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-184%20passing-brightgreen.svg)](#testing)

**Ops** is an intelligent operations assistant that integrates with [Claude Code](https://claude.ai/claude-code) to provide AI-powered morning briefings, priority scoring, and work management for Azure DevOps users.

[Features](#features) • [Installation](#installation) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Contributing](#contributing)

</div>

---

## Why Ops?

Ever start your day wondering *"What should I focus on?"* Ops answers that question by:

- **Gathering** your work items and PRs from Azure DevOps
- **Scoring** them based on priority, VIP involvement, and age
- **Generating** an AI-powered briefing with actionable recommendations
- **Tracking** carryover items from yesterday

All through a simple Claude Code skill: `/ops:morning`

## Features

### Morning Briefing (`/ops:morning`)

Get an AI-generated summary of your day's priorities:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 MORNING BRIEFING — 2026-01-26
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Summary
You have 3 high-priority items requiring attention today, including
a P1 bug assigned by your manager and 2 PRs awaiting your review.

## Top Priorities

1. **Fix authentication timeout** (work_item)
   - Priority reason: P1 priority, VIP involvement
   - Action: Investigate session handling in auth middleware

2. **Review: Add caching layer** (pull_request)
   - Priority reason: VIP author, blocking release
   - Action: Review and provide feedback

───────────────────────────────────────────────────────────────────
Data quality: Tier 1/5 | Carryover: 2 items from yesterday
───────────────────────────────────────────────────────────────────
```

### Configuration Wizard (`/ops:config`)

Interactive setup for your Azure DevOps connection:

```yaml
azure:
  organization: YourOrg
  default_project: YourProject

user:
  name: Your Name
  role: Developer
  team: Your Team

vips:
  - name: Your Manager
    role: Engineering Manager
    priority: high
```

### Smart Features

| Feature | Description |
|---------|-------------|
| **Priority Scoring** | Configurable weights for P1/P2, VIP involvement, age |
| **Graceful Degradation** | 5-tier system handles partial data gracefully |
| **History Tracking** | Persists briefings to `~/.ops/history/` for carryover detection |
| **Token-Aware Context** | Compresses data to fit LLM context windows |
| **Parallel Research** | Fetches ADO and GSD data concurrently |

## Installation

### Prerequisites

- **Node.js 22+** with npm
- **Claude Code** CLI with skill support
- **Azure DevOps** account with a Personal Access Token (PAT)

### Quick Install

```bash
# Clone the repository
git clone https://github.com/orzazade/ops.git
cd ops

# Install dependencies
npm install

# Build the project
npm run build

# Install skills to Claude Code
mkdir -p ~/.claude/commands/ops
cp skills/*.md ~/.claude/commands/ops/
```

### Environment Setup

```bash
# Set your Azure DevOps PAT (required for /ops:morning)
export AZURE_DEVOPS_PAT="your-personal-access-token"
```

Add this to your `~/.zshrc` or `~/.bashrc` for persistence.

## Quick Start

### 1. Configure Ops

Run in Claude Code:
```
/ops:config
```

Or create `~/.ops/config.yaml` manually:
```yaml
azure:
  organization: MyCompany
  default_project: MyProject

user:
  name: John Doe
  role: Senior Developer
  team: Platform Team
```

### 2. Run Your First Briefing

```
/ops:morning
```

That's it! Claude will gather your Azure DevOps data and generate a prioritized briefing.

## Documentation

### Configuration Reference

<details>
<summary><strong>Full Config Schema</strong></summary>

```yaml
# Azure DevOps connection (required)
azure:
  organization: string       # Your Azure DevOps org name
  default_project: string    # Default project for queries

# User profile (optional - for personalized briefings)
user:
  name: string
  role: string
  team: string

# VIP contacts (optional - higher priority scoring)
vips:
  - name: string
    role: string
    priority: highest | high | medium | low

# Priority scoring weights (optional - customize scoring)
priorities:
  sprint_commitment: 3       # Items in sprint commitment
  vip_involvement: 3         # VIP is involved
  blocking_others: 2         # Blocking other work
  age_over_3_days: 2         # Item is over 3 days old
  p1_priority: 2             # P1 priority items
  p2_priority: 1             # P2 priority items
  carried_over: 1            # Carried over from yesterday

# GSD framework settings (optional)
gsd:
  scan_paths: ["."]
  exclude: ["node_modules", ".git"]

# Output preferences (optional)
preferences:
  briefing_length: concise | detailed
  response_style: professional | casual
  timezone: America/New_York   # IANA timezone
```

</details>

<details>
<summary><strong>Project Overrides</strong></summary>

Create `.ops/overrides.yaml` in your project root to override global settings:

```yaml
# Override default project for this repo
azure:
  default_project: SpecificProject

# Add project-specific VIPs
vips:
  - name: Project Lead
    priority: high
```

</details>

<details>
<summary><strong>Data Quality Tiers</strong></summary>

The 5-tier graceful degradation system:

| Tier | Data Available | Description |
|------|----------------|-------------|
| 1 | ADO + GSD + Yesterday | Best case - full context with carryover |
| 2 | ADO + GSD | Good - no history comparison |
| 3 | ADO only or GSD only | Partial - missing one source |
| 4 | Yesterday only | Fallback - showing previous briefing |
| 5 | None | Error - check configuration |

</details>

### Architecture

```
ops/
├── src/
│   ├── azure/           # Azure DevOps API client
│   ├── config/          # Configuration schema & loader
│   ├── context/         # Token-aware context engine
│   ├── integration/     # Morning workflow orchestrator
│   ├── researchers/     # ADO & GSD data gatherers
│   ├── state/           # State directory management
│   ├── triage/          # Priority scoring system
│   └── scripts/         # CLI entry points
├── skills/              # Claude Code skill definitions
└── docs/                # Additional documentation
```

### API Reference

Ops can be used programmatically:

```typescript
import { gatherMorningData, loadConfig } from 'ops';

// Gather scored work data
const result = await gatherMorningData();
if (result.isOk()) {
  console.log(`Tier ${result.value.tier}: ${result.value.scoredItems.length} items`);
}
```

## Development

### Building

```bash
npm run build          # Compile TypeScript
npm run build:watch    # Watch mode
```

### Testing

```bash
npm test               # Run tests in watch mode
npm run test:run       # Run tests once
```

**Current test coverage:** 184 tests across 17 test files

### Project Structure

| Directory | Purpose |
|-----------|---------|
| `src/azure/` | ADO API client with typed interfaces |
| `src/config/` | Zod schemas and YAML config loading |
| `src/context/` | Token budgeting and XML context building |
| `src/integration/` | Workflow orchestration and history |
| `src/researchers/` | Parallel data gatherers (ADO, GSD) |
| `src/triage/` | Priority scoring and briefing schemas |

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -m 'feat: add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test additions or fixes
- `refactor:` - Code refactoring

## Roadmap

### Milestone 1: MVP (v0.1) ✅

- [x] Configuration system with YAML and Zod validation
- [x] Azure DevOps researcher (work items, PRs)
- [x] GSD project scanner
- [x] Token-aware context engine
- [x] Priority scoring system
- [x] `/ops:morning` briefing skill
- [x] History persistence and carryover detection

### Milestone 2: Core Skills (v1.0) ✅

- [x] `/ops:status <project>` - Leadership status reports
- [x] `/ops:respond` - Context-aware response drafting with tone adaptation
- [x] `/ops:priorities` - Mid-day priority updates with delta visualization
- [x] `/ops:eod` - End-of-day summary with accomplishments and blockers

### Milestone 3: UX Polish & Sprint Intelligence (v1.1) 🚧

- [ ] **Output Polish** - Tables, separators, visual hierarchy for all skills
- [ ] **Priority Transparency** - `/ops:why`, `/ops:boost`, `/ops:demote`, `/ops:rules`
- [ ] **Sprint Intelligence** - `/ops:sprint` interactive TUI for sprint management
- [ ] **Ticket Research** - `/ops:research <id>` with parallel investigators
- [ ] **Decision Support** - `/ops:decide` for work recommendations

### Future (v1.2+)

- [ ] Outlook email integration
- [ ] Calendar awareness
- [ ] Teams messages integration
- [ ] Pattern learning (v2.0)
- [ ] Team mode (v2.0)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for [Claude Code](https://claude.ai/claude-code) by Anthropic
- Inspired by the need to start each day with clarity
- Uses the excellent [neverthrow](https://github.com/supermacro/neverthrow) for type-safe error handling

---

<div align="center">

**[Report Bug](https://github.com/orzazade/ops/issues)** • **[Request Feature](https://github.com/orzazade/ops/issues)** • **[Discussions](https://github.com/orzazade/ops/discussions)**

Made with by developers, for developers

</div>
