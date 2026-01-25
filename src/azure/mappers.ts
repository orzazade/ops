/**
 * Mappers for converting Azure DevOps API responses to internal types.
 */

import type { WorkItem } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';
import type { GitPullRequest, IdentityRefWithVote } from 'azure-devops-node-api/interfaces/GitInterfaces.js';
import type { WorkItemData, PullRequestData, ReviewerInfo } from '../researchers/types.js';

/**
 * Maps Azure DevOps vote status to internal vote string.
 */
function mapVote(vote: number | undefined): ReviewerInfo['vote'] {
  switch (vote) {
    case 10:
      return 'approved';
    case 5:
      return 'approved-with-suggestions';
    case 0:
      return 'none';
    case -5:
      return 'waiting';
    case -10:
      return 'rejected';
    default:
      return 'none';
  }
}

/**
 * Maps Azure DevOps PR status to internal status string.
 */
function mapPRStatus(status: number | undefined): string {
  switch (status) {
    case 1:
      return 'active';
    case 2:
      return 'abandoned';
    case 3:
      return 'completed';
    default:
      return 'unknown';
  }
}

/**
 * Maps a work item from Azure DevOps API format to internal format.
 */
export function mapWorkItem(workItem: WorkItem): WorkItemData {
  const fields = workItem.fields || {};

  // Parse tags - ADO uses semicolon-separated string
  const tagsString = fields['System.Tags'] as string | undefined;
  const tags = tagsString
    ? tagsString.split(';').map(t => t.trim()).filter(t => t.length > 0)
    : [];

  return {
    id: workItem.id || 0,
    title: (fields['System.Title'] as string) || '',
    state: (fields['System.State'] as string) || '',
    priority: (fields['Microsoft.VSTS.Common.Priority'] as number) || 0,
    assignedTo: (fields['System.AssignedTo'] as any)?.displayName,
    createdDate: new Date(fields['System.CreatedDate'] as string),
    changedDate: new Date(fields['System.ChangedDate'] as string),
    tags,
    sprintPath: fields['System.IterationPath'] as string | undefined,
  };
}

/**
 * Maps a reviewer from Azure DevOps API format to internal format.
 */
export function mapReviewer(reviewer: IdentityRefWithVote): ReviewerInfo {
  return {
    name: reviewer.displayName || 'Unknown',
    vote: mapVote(reviewer.vote),
    required: reviewer.isRequired || false,
  };
}

/**
 * Maps a pull request from Azure DevOps API format to internal format.
 */
export function mapPullRequest(pr: GitPullRequest): PullRequestData {
  return {
    id: pr.pullRequestId || 0,
    title: pr.title || '',
    author: pr.createdBy?.displayName || 'Unknown',
    status: mapPRStatus(pr.status),
    createdDate: pr.creationDate ? new Date(pr.creationDate) : new Date(),
    repository: pr.repository?.name || '',
    targetBranch: pr.targetRefName || '',
    reviewers: (pr.reviewers || []).map(mapReviewer),
  };
}
