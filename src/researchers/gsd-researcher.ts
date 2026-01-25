import { Result, ok, err } from 'neverthrow';
import fg from 'fast-glob';
import { readFile } from 'fs/promises';
import { dirname } from 'path';
import {
  Researcher,
  ResearcherOutput,
  GSDData,
  GSDProject,
} from './types.js';

/**
 * GSD (Get Shit Done) planning directory researcher.
 * Scans for .planning/ directories and extracts project state.
 */
export class GSDResearcher implements Researcher<GSDData> {
  public readonly name = 'gsd-scanner';

  constructor(
    private readonly basePath: string = process.cwd(),
    private readonly scanDepth: number = 5
  ) {}

  async execute(): Promise<Result<ResearcherOutput<GSDData>, Error>> {
    const startTime = Date.now();

    try {
      // Scan for PROJECT.md files
      const projectFiles = await fg('**/.planning/PROJECT.md', {
        cwd: this.basePath,
        absolute: true,
        deep: this.scanDepth,
        ignore: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
          '**/coverage/**',
          '**/.next/**',
          '**/.cache/**',
        ],
      });

      // Parse each project
      const results = await Promise.allSettled(
        projectFiles.map((file) => this.parseProject(file))
      );

      // Separate successful and failed parses
      const projects: GSDProject[] = [];
      const errors: string[] = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          projects.push(result.value);
        } else {
          errors.push(result.reason?.message || 'Unknown parse error');
        }
      }

      // Determine status
      let status: 'success' | 'partial' | 'failed';
      if (projects.length === 0 && errors.length > 0) {
        status = 'failed';
      } else if (errors.length > 0) {
        status = 'partial';
      } else {
        status = 'success';
      }

      const output: ResearcherOutput<GSDData> = {
        source: 'gsd-scanner',
        status,
        data: { projects },
        metadata: {
          timestamp: new Date(),
          duration_ms: Date.now() - startTime,
          itemsFound: projects.length,
        },
      };

      if (errors.length > 0) {
        output.errors = errors;
      }

      return ok(output);
    } catch (error) {
      return err(
        error instanceof Error ? error : new Error('Unknown error during scan')
      );
    }
  }

  /**
   * Parse a PROJECT.md file and its associated STATE.md.
   */
  private async parseProject(projectFilePath: string): Promise<GSDProject> {
    const planningDir = dirname(projectFilePath);
    const projectDir = dirname(planningDir);

    // Read PROJECT.md
    const projectContent = await readFile(projectFilePath, 'utf-8');
    const { name, ...projectData } = this.parseProjectFile(projectContent);

    // Try to read STATE.md
    const stateFilePath = `${planningDir}/STATE.md`;
    let stateData: Partial<GSDProject> = {};

    try {
      const stateContent = await readFile(stateFilePath, 'utf-8');
      stateData = this.parseStateFile(stateContent);
    } catch (error) {
      // STATE.md is optional, continue without it
    }

    return {
      path: projectDir,
      name,
      ...projectData,
      ...stateData,
    };
  }

  /**
   * Parse PROJECT.md content to extract name and frontmatter.
   */
  private parseProjectFile(content: string): Pick<GSDProject, 'name'> & Partial<GSDProject> {
    const result: Partial<GSDProject> = {};

    // Extract frontmatter if present
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];

      // Extract milestone
      const milestoneMatch = frontmatter.match(/^milestone:\s*["']?(.+?)["']?$/m);
      if (milestoneMatch) {
        result.milestone = milestoneMatch[1];
      }
    }

    // Extract project name from first # heading
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (!headingMatch) {
      throw new Error('PROJECT.md must contain a # heading');
    }

    const name = headingMatch[1];

    return {
      name,
      ...result,
    };
  }

  /**
   * Parse STATE.md content to extract current phase, status, and blockers.
   */
  private parseStateFile(content: string): Partial<GSDProject> {
    const result: Partial<GSDProject> = {};

    // Extract phase (e.g., "Phase: 2 of 5")
    const phaseMatch = content.match(/\*\*Phase:\*\*\s+(\d+\s+of\s+\d+)/);
    if (phaseMatch) {
      result.currentPhase = phaseMatch[1];
    }

    // Extract status (e.g., "Status: In Progress")
    const statusMatch = content.match(/\*\*Status:\*\*\s+(.+?)(?:\n|$)/);
    if (statusMatch) {
      result.status = statusMatch[1];
    }

    // Extract progress percentage (e.g., "4/11 plans complete (36%)")
    const progressMatch = content.match(/\((\d+)%\)/);
    if (progressMatch) {
      result.progress = parseInt(progressMatch[1], 10);
    }

    // Extract blockers from "## Blockers" section
    const blockersMatch = content.match(/##\s+Blockers[^\n]*\n([\s\S]*?)(?=\n##|\n\*\*|$)/);
    if (blockersMatch) {
      const blockersText = blockersMatch[1];
      const blockers = blockersText
        .split('\n')
        .map((line) => line.replace(/^-\s*/, '').trim())
        .filter((line) => line.length > 0);

      if (blockers.length > 0) {
        result.blockers = blockers;
      }
    }

    return result;
  }
}
