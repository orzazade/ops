/**
 * Project filtering for status report workflows.
 * Filters research results to items matching a specific project.
 */

import { ok } from 'neverthrow';
import type { ResearchResults } from '../researchers/orchestrator.js';
import type { ADOData, GSDData } from '../researchers/types.js';

/**
 * Project filter criteria.
 * Filters results to items matching the project name.
 */
export interface ProjectFilter {
  /** Project name to filter by (case-insensitive partial match) */
  projectName: string;
  /** Optional: specific repositories within project to include */
  includeRepos?: string[];
}

/**
 * Filter research results by project name.
 *
 * Filtering logic:
 * - ADO work items: Match against sprintPath (case-insensitive)
 * - ADO pull requests: Match against repository name (case-insensitive)
 * - ADO sprint data: Keep as-is (provides context)
 * - GSD projects: Match against project name (case-insensitive)
 *
 * @param results - Research results from orchestrator
 * @param filter - Project filter criteria
 * @returns Filtered research results with same Result wrapper structure
 */
export function filterByProject(
  results: ResearchResults,
  filter: ProjectFilter
): ResearchResults {
  const projectLower = filter.projectName.toLowerCase();
  const includeReposLower = filter.includeRepos?.map((r) => r.toLowerCase());

  // Filter ADO data if available
  const filteredAdo = results.ado.isOk()
    ? ok({
        ...results.ado.value,
        data: {
          workItems: results.ado.value.data.workItems.filter((item) =>
            item.sprintPath?.toLowerCase().includes(projectLower)
          ),
          pullRequests: results.ado.value.data.pullRequests.filter((pr) => {
            const repoLower = pr.repository.toLowerCase();
            const matchesProject = repoLower.includes(projectLower);

            // If includeRepos specified, additionally filter by repos
            if (includeReposLower && includeReposLower.length > 0) {
              return matchesProject && includeReposLower.some((r) => repoLower.includes(r));
            }

            return matchesProject;
          }),
          // Keep sprint data as-is for context
          sprint: results.ado.value.data.sprint,
        } as ADOData,
      })
    : results.ado;

  // Filter GSD data if available
  const filteredGsd = results.gsd.isOk()
    ? ok({
        ...results.gsd.value,
        data: {
          projects: results.gsd.value.data.projects.filter((project) =>
            project.name.toLowerCase().includes(projectLower)
          ),
        } as GSDData,
      })
    : results.gsd;

  return {
    ado: filteredAdo,
    gsd: filteredGsd,
  };
}
