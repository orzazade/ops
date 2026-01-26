# Ops Project State

## Current Position
- **Milestone:** 2 (Core Skills v1.0)
- **Phase:** 8 (Priority Re-ranking) - IN PROGRESS
- **Plan:** 1 of 2 - COMPLETE
- **Status:** Phase 8 Plan 1 complete (delta calculator and pin storage)
- **Last activity:** 2026-01-26 - Completed 08-01-PLAN.md (Core logic)

**Progress:** ███████████░░░░░ 2.625/4 phases complete (65.6%)

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

## Session Continuity
- **Last session:** 2026-01-26 11:58 UTC
- **Stopped at:** Completed 08-01-PLAN.md (delta calculator and pin storage)
- **Resume file:** None

## Pending TODOs
(none yet)

## Blockers/Concerns
(none identified)
