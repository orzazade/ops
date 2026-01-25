import { Result } from 'neverthrow';

/**
 * Standard output envelope for all researcher implementations.
 * Ensures consistent shape across ADO and GSD researchers.
 */
export interface ResearcherOutput<T> {
  source: 'azure-devops' | 'gsd-scanner';
  status: 'success' | 'partial' | 'failed';
  data: T;
  metadata: {
    timestamp: Date;
    duration_ms: number;
    itemsFound: number;
  };
  errors?: string[];
  warnings?: string[];
}

/**
 * Interface for researcher implementations.
 * All researchers must implement this contract.
 */
export interface Researcher<T> {
  name: string;
  execute(): Promise<Result<ResearcherOutput<T>, Error>>;
}

/**
 * Azure DevOps work item data.
 * Represents a work item with blocking relationships.
 */
export interface WorkItemData {
  id: number;
  title: string;
  state: string;
  priority: number;
  assignedTo?: string;
  createdDate: Date;
  changedDate: Date;
  tags: string[];
  sprintPath?: string;
  blockedBy?: number[];
  blocks?: number[];
}

/**
 * Pull request reviewer information.
 * Tracks reviewer vote and requirement status.
 */
export interface ReviewerInfo {
  name: string;
  vote: 'approved' | 'approved-with-suggestions' | 'waiting' | 'rejected' | 'none';
  required: boolean;
}

/**
 * Azure DevOps pull request data.
 * Represents a PR with reviewer information.
 */
export interface PullRequestData {
  id: number;
  title: string;
  author: string;
  status: string;
  createdDate: Date;
  repository: string;
  targetBranch: string;
  reviewers: ReviewerInfo[];
}

/**
 * Sprint information from Azure DevOps.
 * Tracks sprint progress and timeline.
 */
export interface SprintData {
  name: string;
  startDate: Date;
  endDate: Date;
  daysRemaining: number;
  committedCount: number;
  completedCount: number;
}

/**
 * Combined Azure DevOps research output.
 * Contains work items, pull requests, and optional sprint data.
 */
export interface ADOData {
  workItems: WorkItemData[];
  pullRequests: PullRequestData[];
  sprint?: SprintData;
}

/**
 * GSD project information.
 * Represents a project with planning state.
 */
export interface GSDProject {
  path: string;
  name: string;
  milestone?: string;
  currentPhase?: string;
  status?: string;
  progress?: number;
  remainingTasks?: string[];
  blockers?: string[];
}

/**
 * Combined GSD research output.
 * Contains all discovered GSD projects.
 */
export interface GSDData {
  projects: GSDProject[];
}
