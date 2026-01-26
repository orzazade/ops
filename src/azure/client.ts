/**
 * Azure DevOps API client wrapper.
 * Provides typed access to work items and pull requests.
 */

import * as azdev from 'azure-devops-node-api';
import type { IWorkItemTrackingApi } from 'azure-devops-node-api/WorkItemTrackingApi.js';
import type { IGitApi } from 'azure-devops-node-api/GitApi.js';
import type { IWorkApi } from 'azure-devops-node-api/WorkApi.js';
import type { WorkItem } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';
import type { GitPullRequest, GitRepository } from 'azure-devops-node-api/interfaces/GitInterfaces.js';
import type { TeamSettingsIteration } from 'azure-devops-node-api/interfaces/WorkInterfaces.js';

export interface ADOClientConfig {
  organization: string;
  project: string;
  pat: string;
  team?: string;
}

/**
 * Client for interacting with Azure DevOps APIs.
 * Uses lazy initialization for API clients.
 */
export class ADOClient {
  private connection: azdev.WebApi;
  private witApi?: IWorkItemTrackingApi;
  private gitApi?: IGitApi;
  private workApi?: IWorkApi;

  constructor(private config: ADOClientConfig) {
    const orgUrl = `https://dev.azure.com/${config.organization}`;
    const authHandler = azdev.getPersonalAccessTokenHandler(config.pat);
    this.connection = new azdev.WebApi(orgUrl, authHandler);
  }

  /**
   * Get work item tracking API instance (lazy initialization).
   */
  private async getWorkItemApi(): Promise<IWorkItemTrackingApi> {
    if (!this.witApi) {
      this.witApi = await this.connection.getWorkItemTrackingApi();
    }
    return this.witApi;
  }

  /**
   * Get Git API instance (lazy initialization).
   */
  private async getGitApi(): Promise<IGitApi> {
    if (!this.gitApi) {
      this.gitApi = await this.connection.getGitApi();
    }
    return this.gitApi;
  }

  /**
   * Get Work API instance (lazy initialization).
   */
  private async getWorkApi(): Promise<IWorkApi> {
    if (!this.workApi) {
      this.workApi = await this.connection.getWorkApi();
    }
    return this.workApi;
  }

  /**
   * Get the current iteration for the team.
   * Returns the iteration path (e.g., "AppXite Platform\\Sprint 213").
   */
  async getCurrentIteration(): Promise<TeamSettingsIteration | null> {
    if (!this.config.team) {
      return null;
    }

    const workApi = await this.getWorkApi();
    const teamContext = {
      project: this.config.project,
      team: this.config.team,
    };

    const iterations = await workApi.getTeamIterations(teamContext, 'current');

    if (iterations && iterations.length > 0) {
      return iterations[0];
    }

    return null;
  }

  /**
   * Fetch work items assigned to current user that are not closed.
   * If filterByCurrentSprint is true and team is configured, only fetches items from current sprint.
   */
  async fetchWorkItems(filterByCurrentSprint: boolean = true): Promise<WorkItem[]> {
    const witApi = await this.getWorkItemApi();

    // Build WIQL query
    let iterationFilter = '';

    if (filterByCurrentSprint && this.config.team) {
      const currentIteration = await this.getCurrentIteration();
      if (currentIteration?.path) {
        // Escape backslashes for WIQL
        const escapedPath = currentIteration.path.replace(/\\/g, '\\\\');
        iterationFilter = `AND [System.IterationPath] = '${escapedPath}'`;
      }
    }

    // WIQL query to get work items assigned to me that aren't closed
    const wiql = {
      query: `SELECT [System.Id]
              FROM WorkItems
              WHERE [System.AssignedTo] = @Me
              AND [System.State] NOT IN ('Closed', 'Removed')
              ${iterationFilter}`,
    };

    const result = await witApi.queryByWiql(wiql, { project: this.config.project });

    if (!result.workItems || result.workItems.length === 0) {
      return [];
    }

    const ids = result.workItems.map(wi => wi.id!);

    // Fetch full work item details with all required fields
    const workItems = await witApi.getWorkItems(
      ids,
      [
        'System.Id',
        'System.Title',
        'System.State',
        'Microsoft.VSTS.Common.Priority',
        'System.AssignedTo',
        'System.CreatedDate',
        'System.ChangedDate',
        'System.Tags',
        'System.IterationPath',
      ],
      undefined,
      undefined,
      undefined,
      this.config.project
    );

    return workItems || [];
  }

  /**
   * Fetch active pull requests from all repositories in the project.
   */
  async fetchPullRequests(): Promise<GitPullRequest[]> {
    const gitApi = await this.getGitApi();

    // Get all repositories in the project
    const repositories = await gitApi.getRepositories(this.config.project);

    if (!repositories || repositories.length === 0) {
      return [];
    }

    // Fetch PRs from all repositories
    const allPRs: GitPullRequest[] = [];

    for (const repo of repositories) {
      if (!repo.id) continue;

      const prs = await gitApi.getPullRequests(
        repo.id,
        {
          status: 1, // Active PRs only
        },
        this.config.project
      );

      if (prs) {
        allPRs.push(...prs);
      }
    }

    return allPRs;
  }
}
