import { readFile, access } from 'fs/promises';
import { join, basename } from 'path';
import { EnrichedGSDItem } from './types.js';

/**
 * GSD (Get Shit Done) project enricher.
 * Reads .planning/ directory files to provide rich context about GSD projects.
 */
export class GSDEnricher {
  /**
   * Enrich a GSD project by reading its planning files.
   *
   * @param projectPath - Path to the project directory
   * @returns Enriched GSD item with goal, summary, and state information
   * @throws Error if project directory doesn't exist
   */
  async enrich(projectPath: string): Promise<EnrichedGSDItem> {
    // Verify project directory exists
    try {
      await access(projectPath);
    } catch (error) {
      throw new Error(`Project directory does not exist: ${projectPath}`);
    }

    const planningDir = join(projectPath, '.planning');
    const projectName = basename(projectPath);

    // Find planning files
    const files = await this.findPlanningFiles(planningDir);

    // Extract data from each file
    const goalDescription = files.plan
      ? this.extractGoal(files.plan)
      : null;

    const summary = files.summary
      ? this.extractSummary(files.summary)
      : null;

    const stateInfo = files.state
      ? this.parseStateFile(files.state)
      : { currentPhase: null, status: null };

    return {
      path: projectPath,
      name: projectName,
      goalDescription,
      summary,
      currentPhase: stateInfo.currentPhase,
      status: stateInfo.status,
    };
  }

  /**
   * Find planning files in the .planning directory.
   * Checks for files in both root .planning/ and phases/XX-name/ subdirectories.
   */
  private async findPlanningFiles(planningDir: string): Promise<{
    plan?: string;
    summary?: string;
    state?: string;
  }> {
    const filesToRead = [
      { key: 'plan', filename: 'PLAN.md' },
      { key: 'summary', filename: 'SUMMARY.md' },
      { key: 'state', filename: 'STATE.md' },
    ] as const;

    const files: { plan?: string; summary?: string; state?: string } = {};

    for (const { key, filename } of filesToRead) {
      const filePath = join(planningDir, filename);
      if (await this.fileExists(filePath)) {
        files[key] = await readFile(filePath, 'utf-8');
      }
    }

    return files;
  }

  /**
   * Check if a file exists.
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract goal description from PLAN.md content.
   * Looks for "## Goal" section or "<objective>" XML-style tags.
   */
  private extractGoal(planContent: string): string | null {
    // Try to find ## Goal section
    const goalMatch = planContent.match(/##\s+Goal\s*\n([\s\S]*?)(?=\n##|\n<|$)/);
    if (goalMatch) {
      return goalMatch[1].trim();
    }

    // Try to find <objective> section
    const objectiveMatch = planContent.match(/<objective>\s*([\s\S]*?)\s*<\/objective>/);
    if (objectiveMatch) {
      return objectiveMatch[1].trim();
    }

    return null;
  }

  /**
   * Extract summary from SUMMARY.md content.
   * Truncates to 500 characters if needed, preserving sentence boundaries.
   */
  private extractSummary(summaryContent: string): string | null {
    const trimmed = summaryContent.trim();

    if (trimmed.length <= 500) {
      return trimmed;
    }

    // Truncate at sentence boundary
    const truncated = trimmed.substring(0, 500);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastNewline = truncated.lastIndexOf('\n');
    const cutPoint = Math.max(lastPeriod, lastNewline);

    if (cutPoint > 0) {
      return truncated.substring(0, cutPoint + 1).trim();
    }

    // No sentence boundary found, hard truncate
    return truncated + '...';
  }

  /**
   * Parse STATE.md content to extract current phase and status.
   * Handles the format: "Phase: 15 of 19 (Enrichment Foundation)"
   */
  private parseStateFile(
    stateContent: string
  ): { currentPhase: string | null; status: string | null } {
    const result: { currentPhase: string | null; status: string | null } = {
      currentPhase: null,
      status: null,
    };

    // Extract phase (e.g., "Phase: 1 of 5" or "Phase: 15 of 19 (Enrichment Foundation)")
    const phaseMatch = stateContent.match(/Phase:\s+(\d+\s+of\s+\d+)/);
    if (phaseMatch) {
      result.currentPhase = phaseMatch[1];
    }

    // Extract status (e.g., "Status: In progress")
    const statusMatch = stateContent.match(/Status:\s+(.+?)(?:\n|$)/);
    if (statusMatch) {
      result.status = statusMatch[1].trim();
    }

    return result;
  }
}
