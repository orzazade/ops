/**
 * Tests for data compression functions.
 *
 * Using TDD red-green-refactor cycle:
 * - RED: Write failing tests
 * - GREEN: Implement to pass
 * - REFACTOR: Clean up
 */

import { describe, it, expect } from 'vitest';
import {
  compressWorkItem,
  compressPR,
  compressProject,
  summarizeReviewers,
} from './compression.js';
import type {
  WorkItemData,
  PullRequestData,
  GSDProject,
  ReviewerInfo,
} from '../researchers/types.js';

// Test helper to create work items with defaults
function createWorkItem(overrides: Partial<WorkItemData> = {}): WorkItemData {
  return {
    id: 123,
    title: 'Test work item',
    state: 'Active',
    priority: 1,
    assignedTo: 'user@example.com',
    createdDate: new Date('2024-01-01'),
    changedDate: new Date('2024-01-02'),
    tags: [],
    ...overrides,
  };
}

// Test helper to create PRs with defaults
function createPR(overrides: Partial<PullRequestData> = {}): PullRequestData {
  return {
    id: 456,
    title: 'Test PR',
    author: 'author@example.com',
    status: 'Active',
    createdDate: new Date('2024-01-01'),
    repository: 'org/team/repo-name',
    targetBranch: 'main',
    reviewers: [],
    ...overrides,
  };
}

// Test helper to create projects with defaults
function createProject(overrides: Partial<GSDProject> = {}): GSDProject {
  return {
    path: '/path/to/project',
    name: 'Test Project',
    milestone: 'v1.0',
    currentPhase: 'Phase 1',
    status: 'In Progress',
    progress: 50,
    remainingTasks: [],
    blockers: [],
    ...overrides,
  };
}

describe('compressWorkItem', () => {
  it('keeps essential fields', () => {
    const item: WorkItemData = {
      id: 123,
      title: 'Fix login bug',
      state: 'Active',
      priority: 1,
      assignedTo: 'user@example.com',
      createdDate: new Date(),
      changedDate: new Date(),
      tags: ['bug', 'urgent'],
    };
    const result = compressWorkItem(item);
    expect(result.id).toBe(123);
    expect(result.title).toBe('Fix login bug');
    expect(result.state).toBe('Active');
    expect(result.priority).toBe(1);
    expect(result.assignedTo).toBe('user@example.com');
    expect(result.tags).toEqual(['bug', 'urgent']);
  });

  it('drops non-essential fields', () => {
    const item = createWorkItem({ createdDate: new Date('2024-01-01') });
    const result = compressWorkItem(item);
    expect(result).not.toHaveProperty('createdDate');
    expect(result).not.toHaveProperty('changedDate');
    expect(result).not.toHaveProperty('sprintPath');
  });

  it('truncates long titles at word boundary', () => {
    const longTitle = 'A'.repeat(50) + ' ' + 'B'.repeat(60);
    const item = createWorkItem({ title: longTitle });
    const result = compressWorkItem(item);
    expect(result.title.length).toBeLessThanOrEqual(103); // 100 + '...'
    expect(result.title).toContain('...');
  });

  it('omits empty tags array', () => {
    const item = createWorkItem({ tags: [] });
    const result = compressWorkItem(item);
    expect(result.tags).toBeUndefined();
  });

  it('handles undefined assignedTo', () => {
    const item = createWorkItem({ assignedTo: undefined });
    const result = compressWorkItem(item);
    expect(result.assignedTo).toBeUndefined();
  });

  it('includes tags only when non-empty', () => {
    const item = createWorkItem({ tags: ['bug'] });
    const result = compressWorkItem(item);
    expect(result.tags).toEqual(['bug']);
  });
});

describe('summarizeReviewers', () => {
  it('returns "No reviewers" for empty array', () => {
    expect(summarizeReviewers([])).toBe('No reviewers');
  });

  it('shows all approved count', () => {
    const reviewers: ReviewerInfo[] = [
      { name: 'A', vote: 'approved', required: true },
      { name: 'B', vote: 'approved', required: false },
    ];
    expect(summarizeReviewers(reviewers)).toBe('2/2 approved');
  });

  it('shows mixed status with approved and waiting', () => {
    const reviewers: ReviewerInfo[] = [
      { name: 'A', vote: 'approved', required: true },
      { name: 'B', vote: 'waiting', required: true },
      { name: 'C', vote: 'none', required: false },
    ];
    expect(summarizeReviewers(reviewers)).toBe('1/3 approved, 1 waiting');
  });

  it('highlights rejections', () => {
    const reviewers: ReviewerInfo[] = [
      { name: 'A', vote: 'rejected', required: true },
    ];
    const result = summarizeReviewers(reviewers);
    expect(result).toContain('rejected');
  });

  it('shows multiple statuses', () => {
    const reviewers: ReviewerInfo[] = [
      { name: 'A', vote: 'approved', required: true },
      { name: 'B', vote: 'approved', required: true },
      { name: 'C', vote: 'waiting', required: true },
      { name: 'D', vote: 'rejected', required: true },
    ];
    const result = summarizeReviewers(reviewers);
    expect(result).toBe('2/4 approved, 1 waiting, 1 rejected');
  });
});

describe('compressPR', () => {
  it('extracts repo name from path', () => {
    const pr = createPR({ repository: 'org/team/repo-name' });
    const result = compressPR(pr);
    expect(result.repository).toBe('repo-name');
  });

  it('truncates long titles', () => {
    const pr = createPR({ title: 'A'.repeat(100) });
    const result = compressPR(pr);
    expect(result.title.length).toBeLessThanOrEqual(83); // 80 + '...'
  });

  it('keeps essential fields', () => {
    const pr = createPR({
      title: 'Add new feature',
      author: 'dev@example.com',
      status: 'Active',
      reviewers: [
        { name: 'Reviewer1', vote: 'approved', required: true },
      ],
    });
    const result = compressPR(pr);
    expect(result.id).toBe(456);
    expect(result.title).toBe('Add new feature');
    expect(result.author).toBe('dev@example.com');
    expect(result.status).toBe('Active');
    expect(result.reviewerSummary).toBe('1/1 approved');
  });

  it('drops non-essential fields', () => {
    const pr = createPR();
    const result = compressPR(pr);
    expect(result).not.toHaveProperty('createdDate');
    expect(result).not.toHaveProperty('targetBranch');
    expect(result).not.toHaveProperty('reviewers');
  });

  it('handles repository without slashes', () => {
    const pr = createPR({ repository: 'simple-repo' });
    const result = compressPR(pr);
    expect(result.repository).toBe('simple-repo');
  });
});

describe('compressProject', () => {
  it('keeps essential fields', () => {
    const project: GSDProject = {
      path: '/path/to/project',
      name: 'My Project',
      milestone: 'v1.0',
      currentPhase: 'Phase 2',
      status: 'In Progress',
      progress: 45,
      remainingTasks: ['Task 1', 'Task 2'],
      blockers: ['Blocker 1'],
    };
    const result = compressProject(project);
    expect(result.name).toBe('My Project');
    expect(result.currentPhase).toBe('Phase 2');
    expect(result.status).toBe('In Progress');
    expect(result.blockers).toEqual(['Blocker 1']);
  });

  it('drops non-essential fields', () => {
    const project = createProject({ path: '/some/path', progress: 50 });
    const result = compressProject(project);
    expect(result).not.toHaveProperty('path');
    expect(result).not.toHaveProperty('progress');
    expect(result).not.toHaveProperty('milestone');
  });

  it('limits remainingTasks to 3', () => {
    const project = createProject({
      remainingTasks: ['T1', 'T2', 'T3', 'T4', 'T5'],
    });
    const result = compressProject(project);
    expect(result.remainingTasks).toHaveLength(3);
    expect(result.remainingTasks).toEqual(['T1', 'T2', 'T3']);
  });

  it('handles undefined remainingTasks', () => {
    const project = createProject({ remainingTasks: undefined });
    const result = compressProject(project);
    expect(result.remainingTasks).toBeUndefined();
  });

  it('keeps all tasks if 3 or fewer', () => {
    const project = createProject({
      remainingTasks: ['T1', 'T2'],
    });
    const result = compressProject(project);
    expect(result.remainingTasks).toEqual(['T1', 'T2']);
  });

  it('handles empty blockers', () => {
    const project = createProject({ blockers: [] });
    const result = compressProject(project);
    expect(result.blockers).toEqual([]);
  });
});
