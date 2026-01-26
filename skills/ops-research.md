---
name: ops-research
description: Deep-dive investigation of an Azure DevOps work item
---

# /ops:research

Investigate a work item to understand requirements, find related code, and identify gaps.

## Usage

```
/ops:research <ticket-id>
```

## What This Does

1. Fetches the work item with all relations
2. Searches for related/similar tickets in the same area
3. Prepares code search queries for finding implementations
4. Prepares wiki search queries for finding documentation
5. Analyzes ticket quality (description, acceptance criteria)
6. Generates investigation summary with confidence level

## Instructions for Claude

When the user runs `/ops:research <id>`:

1. Run the research CLI:
   ```bash
   cd /Users/orkhanrzazade/Projects/scifi/ops && npx ts-node src/scripts/research-cli.ts {id}
   ```

2. The CLI outputs XML with investigation findings and search queries.

3. For code search, use the Grep tool with the provided search queries:
   ```
   For each <query> in <code_search_queries>:
     Use Grep tool with pattern and glob from the query
     Report findings with file paths and relevant code snippets
   ```

4. For wiki search, use the Grep tool on any local wiki repos:
   ```
   For each <query> in <wiki_search_queries>:
     Search local wiki/docs directories if available
   ```

5. Synthesize all findings into a summary:
   - What the ticket is about (bug fix or feature?)
   - What code areas are affected
   - What's missing from the ticket (description gaps, missing ACs)
   - Suggested improvements to the ticket

6. If the user wants to apply changes, ask them to run:
   ```
   /ops:research {id} --apply
   ```
   This will show a diff preview and ask for confirmation before updating the ticket.

## Example Output

Investigation for ticket #12345:

### Ticket Quality
- Description: Needs improvement (too brief)
- Acceptance Criteria: Missing

### Related Items
- #12340 (Parent): "Epic: Pricing Engine"
- #12342 (Related): "Fix discount calculation"

### Code Areas
Found implementations in:
- src/pricing/calculator.ts (lines 45-78)
- src/pricing/discount-rules.ts (lines 12-30)

### Suggested Changes
1. Add detailed description explaining the pricing calculation issue
2. Add acceptance criteria:
   - Given a product with 10% discount, when calculating price...
   - Error case: when discount > 100%...
