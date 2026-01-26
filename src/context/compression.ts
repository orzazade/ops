/**
 * Data compression functions for LLM context optimization.
 *
 * These functions reduce token usage by:
 * - Dropping low-value fields (dates, paths, metadata)
 * - Truncating long text at word boundaries
 * - Summarizing complex structures (e.g., reviewer lists)
 *
 * Strategy: Selective inclusion over summarization to preserve accuracy.
 */

import type {
  WorkItemData,
  PullRequestData,
  GSDProject,
  ReviewerInfo,
} from '../researchers/types.js';
import type {
  CompressedWorkItem,
  CompressedPR,
  CompressedProject,
} from './types.js';
import { truncateText } from './utils.js';

/**
 * Compress work item to essential fields.
 *
 * Drops: createdDate, changedDate, sprintPath, blockedBy, blocks
 * Keeps: id, title (truncated), state, priority, assignedTo, tags (if non-empty)
 *
 * @param item - Full work item data
 * @returns Compressed work item optimized for context
 */
export function compressWorkItem(item: WorkItemData): CompressedWorkItem {
  const compressed: CompressedWorkItem = {
    id: item.id,
    title: truncateText(item.title, 100),
    state: item.state,
    priority: item.priority,
  };

  // Only include assignedTo if defined
  if (item.assignedTo !== undefined) {
    compressed.assignedTo = item.assignedTo;
  }

  // Only include tags if non-empty
  if (item.tags && item.tags.length > 0) {
    compressed.tags = item.tags;
  }

  return compressed;
}

/**
 * Summarize reviewer status into concise string.
 *
 * Examples:
 * - [] -> "No reviewers"
 * - [approved, approved] -> "2/2 approved"
 * - [approved, waiting, none] -> "1/3 approved, 1 waiting"
 * - [rejected] -> "0/1 approved, 1 rejected"
 *
 * @param reviewers - List of reviewer info
 * @returns Human-readable summary string
 */
export function summarizeReviewers(reviewers: ReviewerInfo[]): string {
  if (reviewers.length === 0) {
    return 'No reviewers';
  }

  const total = reviewers.length;
  const approved = reviewers.filter(
    (r) => r.vote === 'approved' || r.vote === 'approved-with-suggestions'
  ).length;
  const waiting = reviewers.filter((r) => r.vote === 'waiting').length;
  const rejected = reviewers.filter((r) => r.vote === 'rejected').length;

  const parts: string[] = [];

  // Always show approved count
  parts.push(`${approved}/${total} approved`);

  // Add waiting count if any
  if (waiting > 0) {
    parts.push(`${waiting} waiting`);
  }

  // Add rejected count if any
  if (rejected > 0) {
    parts.push(`${rejected} rejected`);
  }

  return parts.join(', ');
}

/**
 * Compress pull request to essential fields.
 *
 * Drops: createdDate, targetBranch, full reviewer details
 * Keeps: id, title (truncated), author, status, repository (name only)
 * Summarizes: reviewers into concise status string
 *
 * @param pr - Full pull request data
 * @returns Compressed PR optimized for context
 */
export function compressPR(pr: PullRequestData): CompressedPR {
  // Extract just the repo name from path (e.g., "org/team/repo-name" -> "repo-name")
  const repoName = pr.repository.split('/').pop() || pr.repository;

  return {
    id: pr.id,
    title: truncateText(pr.title, 80),
    author: pr.author,
    status: pr.status,
    repository: repoName,
    reviewerSummary: summarizeReviewers(pr.reviewers),
  };
}

/**
 * Compress project to essential fields.
 *
 * Drops: path, milestone, progress
 * Keeps: name, currentPhase, status, blockers
 * Limits: remainingTasks to first 3
 *
 * @param project - Full GSD project data
 * @returns Compressed project optimized for context
 */
export function compressProject(project: GSDProject): CompressedProject {
  const compressed: CompressedProject = {
    name: project.name,
  };

  // Include optional fields if present
  if (project.currentPhase !== undefined) {
    compressed.currentPhase = project.currentPhase;
  }

  if (project.status !== undefined) {
    compressed.status = project.status;
  }

  // Limit remainingTasks to first 3
  if (project.remainingTasks !== undefined) {
    compressed.remainingTasks = project.remainingTasks.slice(0, 3);
  }

  // Keep blockers (critical info)
  if (project.blockers !== undefined) {
    compressed.blockers = project.blockers;
  }

  return compressed;
}
