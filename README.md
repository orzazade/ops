# Ops

An intelligent operations assistant for Azure DevOps, designed to work with Claude Code as a skill-based CLI tool.

## Overview

Ops helps you manage your Azure DevOps work items, track priorities, and stay on top of your daily tasks. It integrates with Claude Code through the skill system, providing natural language interactions for DevOps workflows.

## Installation

### Prerequisites

- Node.js 18+ with npm
- Claude Code CLI with skill support
- Azure DevOps account with a Personal Access Token (PAT)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ops.git
   cd ops
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install the ops skills**

   Copy the skill files to your Claude commands directory:
   ```bash
   mkdir -p ~/.claude/commands/ops
   cp -r skills/* ~/.claude/commands/ops/
   ```

4. **Configure ops**

   Run the config skill in Claude Code:
   ```
   /ops:config
   ```

   Or create the config manually at `~/.ops/config.yaml`:
   ```yaml
   azure:
     organization: YourOrgName
     default_project: YourProject

   user:
     name: Your Name
     role: Developer
     team: Your Team
   ```

## Configuration

The config file lives at `~/.ops/config.yaml`. Use `/ops:config` to create or edit it interactively.

### Config Schema

```yaml
# Required - Azure DevOps connection
azure:
  organization: string       # Your Azure DevOps org name
  default_project: string    # Default project (optional)

# Optional - User profile for personalized briefings
user:
  name: string
  role: string
  team: string

# Optional - Important people to track
vips:
  - name: string
    role: string
    priority: highest | high | medium | low

# Priority weights for work item scoring
priorities:
  sprint_commitment: 3       # Items in sprint commitment
  vip_involvement: 3         # VIP is involved
  blocking_others: 2         # Blocking other work
  age_over_3_days: 2         # Item is over 3 days old
  p1_priority: 2             # P1 priority items
  p2_priority: 1             # P2 priority items
  carried_over: 1            # Carried over from previous sprint

# GSD framework settings
gsd:
  scan_paths: ["."]          # Paths to scan for planning files
  exclude: ["node_modules", ".git"]

# Output preferences
preferences:
  briefing_length: concise | detailed
  response_style: professional | casual
  timezone: string           # IANA timezone
```

### Project Overrides

Create `.ops/overrides.yaml` in your project root to override global settings for specific projects.

## Usage

### Available Skills

| Skill | Description |
|-------|-------------|
| `/ops:config` | Create or edit configuration |

More skills coming soon:
- `/ops:briefing` - Morning briefing with prioritized work items
- `/ops:focus` - Get recommended focus item
- `/ops:status` - Quick status check

### Config Wizard

The config wizard helps you set up your configuration interactively:

```bash
# Check current config
npx tsx src/scripts/config-wizard.ts show

# Create config from JSON
echo '{"azure":{"organization":"MyOrg"}}' | npx tsx src/scripts/config-wizard.ts create
```

## Development

### Project Structure

```
ops/
├── src/
│   ├── config/           # Configuration schema and loading
│   │   ├── schema.ts     # Zod schema definitions
│   │   └── loader.ts     # Config loading utilities
│   ├── state/            # State management
│   │   ├── paths.ts      # Path constants
│   │   └── init.ts       # State initialization
│   ├── utils/            # Utilities
│   │   ├── errors.ts     # Error classes with suggestions
│   │   └── graceful.ts   # Graceful degradation utilities
│   ├── scripts/          # CLI scripts
│   │   └── config-wizard.ts
│   └── index.ts          # Main exports
├── skills/               # Claude Code skill definitions
└── docs/                 # Documentation
```

### Building

```bash
npm run build
```

### Testing

```bash
# Run tests
npm test

# Run tests once
npm run test:run
```

### State Directories

- `~/.ops/` - Global state directory
  - `config.yaml` - Global configuration
  - `history/` - Command history
  - `cache/` - Cached data
- `.ops/` - Project-local state (in project root)
  - `overrides.yaml` - Project-specific config overrides

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Modules**: ES Modules (type: module)
- **Validation**: Zod for runtime schema validation
- **Config Format**: YAML
- **Testing**: Vitest

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

ISC
