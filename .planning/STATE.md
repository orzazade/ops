# Ops Project State

## Project Reference
- **Core Value:** AI-powered DevOps assistant for morning briefings, priority scoring, and work management
- **Current Focus:** Transform outputs into beautiful, scannable format with interactive sprint management

## Current Position
- **Milestone:** 3 (UX Polish & Sprint Intelligence v1.1)
- **Phase:** 14 (Decision Support) — COMPLETE ✓
- **Plan:** 3 of 3 complete (14-03-PLAN.md)
- **Status:** Phase 14 complete ✓
- **Last activity:** 2026-01-27 — Completed 14-03-PLAN.md (Decision Workflow and CLI Integration)

**Progress:** [████████████████████] 5/5 milestone 3 phases complete (100%)
**Next:** Milestone 3 complete! Ready for next milestone planning

## Milestone 3 Phases

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 10 | Output Polish | UX-01 to UX-07 | Complete |
| 11 | Priority Transparency | PRI-01 to PRI-05 | Complete |
| 12 | Sprint Intelligence | SPR-01 to SPR-06 | Complete |
| 13 | Ticket Research | RSH-01 to RSH-05 | Complete |
| 14 | Decision Support | DEC-01 to DEC-05 | Complete |

## Accumulated Decisions
- Config uses `azure` key (not `azure_devops`)
- Skills install in `~/.claude/commands/ops/`
- State directories: `~/.ops/` (global), `.ops/` (project)
- YAML parsing via `yaml` package, validation via Zod
- ES modules throughout project (type: module in package.json)
- TDD approach with red-green-refactor cycle
- Global config at ~/.ops/config.yaml, project overrides at .ops/overrides.yaml
- State directories use recursive mkdir for idempotent creation
- Project state (.ops/) only created when inside git repository
- Error classes include actionable suggestions (e.g., 'Run /ops:config')
- Graceful degradation logs errors but returns partial results
- Module exports via index.ts for clean public API
- Skill files installed globally (not in repo) at ~/.claude/commands/ops/
- Config wizard accepts JSON via stdin for scriptable config creation
- Generated YAML includes helpful comments for manual editing
- Use neverthrow Result type for type-safe error handling
- ResearcherOutput<T> provides standard envelope for all researchers
- Type predicates with 'is' keyword prevent Promise.allSettled narrowing issues
- fast-glob with explicit ignore patterns (node_modules, .git, dist, etc.) for directory scanning
- STATE.md is optional - researchers gracefully handle missing state files
- Partial failures return status='partial' with available data and errors array
- ESM module mocking in Vitest requires vi.mock() at module level with factory function
- ADO vote mapping: 10=approved, 5=approved-with-suggestions, 0=none, -5=waiting, -10=rejected
- Lazy-initialized API clients reduce overhead and improve testability
- Promise.allSettled pattern enables graceful degradation for independent parallel operations
- ResearchOrchestrator accepts Researcher interfaces via dependency injection for testability
- Helper methods (hasAnyResults, getTotalItems) simplify result processing
- Compressed types drop non-essential fields to reduce token usage while preserving key information
- XML escaping order matters: ampersand first to avoid double-escaping
- Text truncation at word boundaries with fallback to hard truncate for single long words
- Overflow handler does NOT allocate new section (caller responsibility after success)
- Shortfall calculated as tokens_needed - remaining_after_drop
- Priority-based eviction drops lowest priority sections first to make space
- Selective inclusion (drop fields) over summarization preserves accuracy while reducing tokens
- Type-specific compression: work items 100 chars, PRs 80 chars, projects limit 3 tasks
- Reviewer summarization reduces token usage by ~80% while preserving status info
- Priority displayed as P1, P2, P3 format for work items in XML output
- Optional fields only included when present to reduce XML size
- Repository paths reduced to name only for PRs in XML output
- Empty arrays produce self-closing XML tags for minimal output
- Conditional XML fields use ternary operators for inline construction
- Anthropic SDK for accurate token counting with 4-chars-per-token fallback
- Default priorities: workItems=10, pullRequests=8, projects=6
- Priority sorting in build() for 'lost in the middle' mitigation
- fromResearchResults logs warnings but doesn't fail on overflow
- VIP matching uses case-insensitive partial matching for flexible name matching
- Type discriminants ('work_item' | 'pull_request') enable type-safe union handling
- Scoring rules limited to data available in compressed types (P1, P2, VIP involvement)
- Deferred scoring rules requiring context: blocking_others, sprint_commitment, age_over_3_days, carried_over
- Claude structured outputs beta (structured-outputs-2025-11-13) for guaranteed JSON schema compliance
- Manual Zod-to-JSON-Schema conversion sufficient for simple schemas (consider library for complex schemas)
- @ts-expect-error used for beta API parameters not yet in TypeScript definitions
- BriefingGenerator uses dependency injection pattern for testability (optional client parameter)
- UTC-based date handling (getUTCFullYear, getUTCDate) ensures timezone-consistent filenames
- Set-based lookup for O(1) performance in carryover identification
- Graceful degradation: loadBriefing returns undefined on any error (missing history is normal)
- 5-tier degradation system quantifies data availability: Tier 1 (best: ADO+GSD+Yesterday) to Tier 5 (worst: no data)
- Compress data (compressWorkItem/compressPR) before scoring to match context engine compressed types
- Error briefings persisted even on failure for debugging (Tier 5 generates error briefing with blockers)
- Fallback briefings use yesterday's data when no new data available (Tier 4)
- Simplified test strategy focuses on tier determination logic (complex mocking deferred)
- Claude Code integration for briefing generation: CLI outputs XML, skill instructs Claude to generate briefing
- gatherMorningData() provides data without requiring ANTHROPIC_API_KEY (for Claude Code subscription users)
- Project filtering uses case-insensitive partial matching for flexible project name matching
- Status workflow uses 4-tier degradation system (1=best: ADO+GSD, 4=worst: no data)
- Sprint data kept unfiltered in status reports to provide broader team context
- Status workflow does not call Anthropic API (Claude Code integration pattern for reports)
- ResponseGenerator uses tone adaptation (formal for VIPs, conversational for peers)
- Response schemas enforce 2-3 distinct options via min/max constraints
- Manual Zod-to-JSON-Schema conversion for response drafts (simple schemas don't need library)
- ResponseContext interface separates item data from recipient metadata
- buildToneGuidance() provides explicit tone instructions for Claude (VIP vs peer)
- Respond workflow loads today's briefing with yesterday fallback
- VIP detection uses case-insensitive partial matching against config.vips
- Recipient extraction uses pattern matching (@mention, assigned to, from, by)
- Respond CLI outputs XML for Claude Code skill to format
- Skills installed globally to ~/.claude/commands/ops/ for cross-project access
- Map-based O(1) lookups for delta calculation performance (vs O(n*m) nested loops)
- Pins persist to ~/.ops/pins.json with version field for schema evolution
- Graceful degradation returns empty array on missing/corrupt pins file
- Set-based lookups for O(1) pin membership checks in applyPins()
- Bootstrap pattern generates fresh baseline when morning briefing missing/stale
- Staleness check uses isSameDay() UTC comparison to detect day boundaries
- Selective re-scoring: unchanged items keep baseline scores, changed/added items re-scored
- formatTimeSince() provides human-readable time differences (minutes/hours/days ago)
- CLI outputs XML data, skill instructs Claude to apply visual formatting
- Pin/unpin operations execute workflow to validate item exists before modifying pins
- Default item type is work_item for CLI convenience (PRs require --type=pull_request)
- Visual delta markers: pinned, new, changed, done, unchanged icons
- EOD summaries persist to separate ~/.ops/history/eod/ directory for cleaner organization
- BriefingItem schema reused in EOD types for consistency between morning and EOD
- Carryover reason enum: blocked, deprioritized, no_time, partially_complete
- Blocker age tracking with blockedSince and daysBlocked fields
- GSD progress tracking captures progressDelta, newPhasesCompleted, currentPhase
- Accomplishment detection reuses calculateDelta for O(n+m) performance
- Blocker age increments daily via yesterday's EOD comparison
- Escalation suggestions at 3+ days blocked threshold
- Carryover reason priority: blocked > partially_complete > deprioritized > no_time
- Pure function versions (calculateBlockerAgeWithYesterday) enable testing without async
- Evidence field explains inference reasoning for transparency
- EOD workflow uses 4-tier degradation system (vs 5-tier morning) since yesterday EOD not a data source
- Blocker extraction via priority_reason pattern matching for "blocked" keyword
- Personal journal tone in /ops:eod skill (first person, reflective, honest)
- Escalation threshold at 3+ days blocked with suggested actions
- EOD workflow follows priorities-workflow pattern (not morning-workflow)
- Use Unicode escape sequences for emoji in TypeScript for encoding safety
- Formatter layer separation: src/formatters/ module for all presentation logic
- Type-safe emoji vocabulary: EMOJI const with EmojiKey type
- Width-aware truncation: truncateTitle() respects visual width via string-width
- Tables return placeholder text for empty arrays (e.g., "_No work items_")
- Skill formatting uses boxen-style headers for major sections, dashed separators for subsections
- Emoji vocabulary: red P1, orange P2, yellow P3 for priority (traffic light)
- Delta emoji: green new, up arrow changed up, down arrow changed down, dash unchanged
- EOD blockers use warning emoji for 3+ days (escalation needed), stop sign for < 3 days
- Leadership tone guidelines for status skill: concise, factual, health indicators first
- Overrides expire at midnight UTC (not 24 hours from creation) for simpler mental model
- Re-boosting same item replaces previous override (no stacking allowed)
- Manual boost/demote rules added to appliedRules array for transparency in score breakdown
- Override pattern: load → filter expired → apply → save cleaned
- Map-based O(1) lookup for override application performance
- Prose format for score explanations (not table) for better readability
- Top 2 rules for score hints to keep inline display compact
- Grouped categories for rules display: Priority, People, Age, State
- Rule name formatting centralized for consistency across explainer and table
- Score hints use short names (P1, VIP, old) for brevity
- Custom rule weights persist to ~/.ops/rules.json (separate from config.yaml)
- Interactive rules editor uses @inquirer/prompts for menu-driven UX
- Default boost/demote amount is 10 points
- why-cli fetches live ADO data to show current state
- Score hints show top 2 rules by absolute weight for brevity
- Sprint capacity defaults to 20 story points (configurable via sprint.capacity_points)
- Story points default to 3 if unset on work items to prevent zero-point skewing
- Over-commitment threshold is 120% capacity (isOverCommitted flag)
- cli-progress package for terminal progress bar visualization
- First-Fit Decreasing algorithm for optimal sprint work distribution
- Deferral suggestions prioritize: P3 > P2 > P1, then oldest, then largest items
- TDD methodology with atomic commits: test → feat → refactor cycle
- JSON Patch Document format for ADO work item updates (standard REST API pattern)
- Sequential operation execution respects ADO API rate limits (avoids 429 errors)
- Progress callbacks optional for CLI and programmatic operations
- Color-coded capacity thresholds: green <80%, yellow 80-100%, red >100%, bright red >120%
- suppressNotifications=true on ADO updates to avoid email spam during batch operations
- Investigator interface accepts context parameter (ticket ID, project, org, repo paths)
- WorkItemWithRelations uses Map for relationship types tracking
- WIQL keyword search uses CONTAINS operator for flexible substring matching
- diff and simple-git packages for code analysis in investigators
- Code investigator prepares search queries but delegates search to Claude Code's Grep tool
- Repository cloning requires explicit user confirmation to avoid unexpected large downloads
- Clone URLs include PAT authentication for private Azure DevOps repos
- Diff output uses normalized line endings (CRLF to LF) for consistent comparisons
- detectRepoReferences extracts repo names from ticket content using pattern matching
- extractKeywords finds PascalCase, camelCase, and technical terms for code search
- TicketInvestigator maps ADO relation types to semantic categories (hierarchical, related, duplicate, linked)
- WikiInvestigator prepares search queries but delegates wiki search to skill layer
- InvestigationOrchestrator uses Promise.allSettled for parallel execution with graceful degradation
- Similar ticket search excludes current ticket and already-related items to avoid redundancy
- InvestigationContext includes optional workItem field for keyword extraction across investigators
- CodeInvestigator uses extractKeywords() with workItem title/description from context
- ResearchWorkflow prepares investigation summary with confidence (3=HIGH, 2=MEDIUM, 1/0=LOW)
- ApplyWorkflow uses JSON Patch Document format with suppressNotifications=true
- Time-of-day detection uses local timezone for user-centric work mode categorization
- Deep work mode: 8-11am (peak focus), meeting mode: 11am-2pm, admin mode: 2-5pm, after-hours: weekends/outside 8am-6pm
- Work classification uses title keywords only (description not in CompressedWorkItem)
- Default to deep work type when classification uncertain (conservative approach)
- Time-fit scoring matrix: 1.0 perfect, 0.7 acceptable, 0.5 mismatch for work mode alignment
- 10% score threshold for alternative recommendations (avoid overwhelming with too many options)
- Heuristic effort estimation: quick (30min), medium (2hr), deep (half-day+) based on keywords
- Context links empty in compressed types (token optimization, could reconstruct URLs if needed)
- Decision workflow follows priorities-workflow orchestration pattern (consistent across all workflows)
- CLI outputs XML to stdout, metadata to stderr (clean data/diagnostics separation)
- Advisory tone for decision recommendations: "I recommend...", "I considered..." (friendly, not directive)

## Session Continuity
- **Last session:** 2026-01-27 00:37 UTC
- **Stopped at:** Completed 14-03-PLAN.md (Decision Workflow and CLI Integration)
- **Resume file:** None

## Pending TODOs
(none yet)

## Blockers/Concerns
(none identified)
