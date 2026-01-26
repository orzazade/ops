---
name: ops:sprint
description: Interactive sprint capacity management with TUI for moving work items
allowed-tools:
  - Bash
---

<objective>
Provide an interactive terminal UI for managing sprint capacity and moving work items between sprints.

Shows current sprint capacity with visual progress bar, suggests deferrals when over-committed, and allows selecting items to move to future sprints.
</objective>

<process>

## Step 1: Run the Interactive Sprint CLI

Execute the sprint CLI to launch the interactive TUI:

```bash
cd /Users/orkhanrzazade/Projects/scifi/ops && npx tsx src/scripts/sprint-cli.ts
```

The CLI will:
1. Load sprint capacity from config (default: 20 points)
2. Fetch current sprint items assigned to the user
3. Display capacity progress bar with color coding:
   - **Green** (<80%): Good capacity
   - **Yellow** (80-100%): Near capacity
   - **Red** (100-120%): At capacity
   - **Bright Red** (>120%): Over-committed
4. Show deferral suggestions if over-committed (>120%)
5. Present interactive checkbox selection for items
6. Allow choosing destination sprint or intelligent distribution
7. Execute moves with confirmation and progress feedback

## Step 2: Interactive Item Selection

The TUI displays items with format:
```
#[ID] [Title truncated to 45 chars] | [points]pts | [P1/P2/P3] | [age]d
```

**Controls:**
- **Space**: Toggle selection
- **Enter**: Confirm selection
- **Arrow keys**: Navigate items

**Running totals:** Selected items count and total story points are shown.

## Step 3: Choose Destination

After selecting items, choose how to move them:

**Option A: Specific Sprint**
- Select a future sprint from the list
- All selected items move to that sprint

**Option B: Intelligent Distribution** (future enhancement)
- Uses First-Fit Decreasing algorithm
- Auto-balances across future sprints
- Respects capacity limits

## Step 4: Confirmation and Execution

- Review the move plan
- Confirm before executing
- Progress bar shows real-time move status
- Success/failure summary displayed at the end

</process>

<capacity_rules>

## Capacity Calculation

**Story Points:**
- Uses `Microsoft.VSTS.Scheduling.StoryPoints` field from ADO
- Defaults to **3 points** if field is unset
- Sprint capacity configured in `~/.ops/config.yaml` (`sprint.capacity_points`, default: 20)

**Utilization Thresholds:**
- **<80%**: Green - Good capacity
- **80-100%**: Yellow - Near capacity
- **100-120%**: Red - At capacity (no warning)
- **>120%**: Bright Red - Over-committed (triggers warnings + suggestions)

**Over-Commitment:**
- Threshold: **120% of capacity**
- Triggers deferral suggestions
- Uses priority-based selection: P3 > P2 > P1, then oldest, then largest

</capacity_rules>

<examples>

## Example: Normal Sprint (Under Capacity)

```
============================================================
 SPRINT: Sprint 214
============================================================

Capacity: ████████████░░░░░░░░ 15/20 points (75%)

Select items to move (Space to toggle, Enter to confirm)
❯ ◯ #12345 Fix authentication bug in login flow | 5pts | P1 | 3d
  ◯ #12346 Add user profile page | 8pts | P2 | 7d
  ◯ #12347 Update documentation for API endpoints | 2pts | P3 | 14d
```

**Expected behavior:**
- Green progress bar
- No warnings or suggestions
- Interactive selection available
- Can freely move items between sprints

## Example: Over-Committed Sprint (>120%)

```
============================================================
 SPRINT: Sprint 214
============================================================

Capacity: ████████████████████████ 28/20 points (140%)

⚠️  Sprint is OVER-COMMITTED (>120% capacity)
   Excess: 8 points over capacity

Suggested deferrals:
  - #12347: Update documentation for API endpoints... (Lowest priority (P3))
  - #12348: Refactor legacy payment processing cod... (Lower priority (P2), Oldest item (45d))

Select items to move (Space to toggle, Enter to confirm)
❯ ◯ #12345 Fix authentication bug in login flow | 5pts | P1 | 3d
  ◯ #12346 Add user profile page | 8pts | P2 | 7d
  ◯ #12347 Update documentation for API endpoints | 2pts | P3 | 14d
  ◯ #12348 Refactor legacy payment processing code | 8pts | P2 | 45d
  ◯ #12349 Add unit tests for checkout flow | 5pts | P1 | 2d
```

**Expected behavior:**
- Bright red progress bar with warning symbol
- Deferral suggestions prioritized by: priority (P3 first) → age → size
- Interactive selection still available
- User can choose to defer suggested items or manage manually

</examples>

<troubleshooting>

## No Items Found

**Issue:** "No work items found in current sprint"

**Causes:**
- No items assigned to you in the current sprint
- Team not configured in `~/.ops/config.yaml`
- ADO authentication issues

**Solutions:**
1. Verify team configuration: `cat ~/.ops/config.yaml | grep team`
2. Check ADO connection: Ensure `AZURE_DEVOPS_PAT` is set
3. Verify current sprint has items assigned to you in ADO

## Authentication Error

**Issue:** "AZURE_DEVOPS_PAT environment variable not set"

**Solution:**
Set your Azure DevOps PAT:
```bash
export AZURE_DEVOPS_PAT="your-pat-here"
```

Add to `~/.zshrc` or `~/.bashrc` for persistence.

## No Future Sprints Available

**Issue:** "No future sprints available"

**Causes:**
- No future iterations defined in ADO
- All iterations have ended

**Solutions:**
1. Create future sprints in Azure DevOps
2. Ensure sprint end dates are in the future
3. Verify team iteration configuration

## TypeScript Compilation Errors

**Issue:** CLI fails to run with TypeScript errors

**Solution:**
Rebuild the project:
```bash
cd /Users/orkhanrzazade/Projects/scifi/ops
npm run build
```

</troubleshooting>

<notes>

## Configuration

Sprint capacity is configurable in `~/.ops/config.yaml`:

```yaml
sprint:
  capacity_points: 20  # Default: 20 story points
```

## Story Point Defaults

Items without story points default to **3 points** to prevent zero-point items from skewing capacity calculations.

## Move Operations

- Moves are **sequential** (not parallel) to respect ADO API rate limits
- Each move updates only the `System.IterationPath` field
- Notifications are **suppressed** to avoid email spam during batch operations
- Moves use JSON Patch Document format (ADO REST API standard)

## Future Enhancements

**Intelligent Distribution** (not yet implemented):
- First-Fit Decreasing bin packing algorithm
- Auto-balance across multiple sprints
- Respect capacity limits per sprint
- Minimize number of sprints needed

</notes>
