# Ops Project State

## Project Reference
- **Core Value:** AI-powered DevOps assistant for morning briefings, priority scoring, and work management
- **Current Focus:** Claude-powered decision engine (AI reasoning vs rule-based scoring)

## Current Position
- **Milestone:** 4 (Claude-Powered Decisions v1.2) — Planning
- **Phase:** Not started (defining requirements)
- **Plan:** —
- **Status:** Ready to plan
- **Last activity:** 2026-01-27 — v1.1 milestone complete, archived

**Progress:** Starting fresh milestone

**Next:** `/gsd:new-milestone` to define v1.2 requirements and roadmap

## Accumulated Decisions
- Config uses `azure` key (not `azure_devops`)
- Skills install in `~/.claude/commands/ops/`
- State directories: `~/.ops/` (global), `.ops/` (project)
- YAML parsing via `yaml` package, validation via Zod
- ES modules throughout project (type: module in package.json)
- TDD approach with red-green-refactor cycle
- Global config at ~/.ops/config.yaml, project overrides at .ops/overrides.yaml
- Use neverthrow Result type for type-safe error handling
- Local timezone for time-of-day detection (not UTC)
- npm run install:skills to sync all skills to global

## Session Continuity
- **Last session:** 2026-01-27
- **Stopped at:** Completed v1.1 milestone, starting v1.2

## Pending TODOs
(none yet)

## Blockers/Concerns
(none identified)
