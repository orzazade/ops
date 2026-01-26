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
import type { JsonPatchDocument } from 'azure-devops-node-api/interfaces/common/VSSInterfaces.js';

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

  /**
   * Update a work item's iteration path (move to different sprint).
   * Uses JSON Patch Document format as per ADO REST API.
   *
   * @param id - Work item ID
   * @param iterationPath - Full iteration path (e.g., "Project\\Sprint 214")
   */
  async updateWorkItem(id: number, iterationPath: string): Promise<void> {
    const witApi = await this.getWorkItemApi();

    const patchDoc: JsonPatchDocument = [
      {
        op: 'add',
        path: '/fields/System.IterationPath',
        value: iterationPath,
      }
    ];

    await witApi.updateWorkItem(
      null,              // customHeaders
      patchDoc,
      id,
      this.config.project,
      false,             // validateOnly
      false,             // bypassRules
      true               // suppressNotifications
    );
  }

  /**
   * Get future iterations (sprints) for the team.
   * Returns iterations that haven't ended yet, sorted by start date.
   */
  async getFutureIterations(): Promise<TeamSettingsIteration[]> {
    if (!this.config.team) {
      return [];
    }

    const workApi = await this.getWorkApi();
    const teamContext = {
      project: this.config.project,
      team: this.config.team,
    };

    // Get all iterations
    const iterations = await workApi.getTeamIterations(teamContext);

    if (!iterations) {
      return [];
    }

    const now = new Date();

    // Filter to future iterations (end date in future or no end date)
    const future = iterations.filter(iter => {
      if (!iter.attributes?.finishDate) return true;
      return new Date(iter.attributes.finishDate) > now;
    });

    // Sort by start date ascending
    return future.sort((a, b) => {
      const aStart = a.attributes?.startDate ? new Date(a.attributes.startDate).getTime() : 0;
      const bStart = b.attributes?.startDate ? new Date(b.attributes.startDate).getTime() : 0;
      return aStart - bStart;
    });
  }
}
