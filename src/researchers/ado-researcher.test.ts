import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ADOResearcher } from './ado-researcher.js';
import type { ADOConfig } from '../config/schema.js';

// Mock the azure-devops-node-api module
vi.mock('azure-devops-node-api', () => {
  const mockWorkItemTrackingApi = {
    queryByWiql: vi.fn(),
    getWorkItems: vi.fn(),
  };

  const mockGitApi = {
    getPullRequests: vi.fn(),
    getRepositories: vi.fn(),
  };

  return {
    WebApi: vi.fn().mockImplementation(() => ({
      getWorkItemTrackingApi: vi.fn().mockResolvedValue(mockWorkItemTrackingApi),
      getGitApi: vi.fn().mockResolvedValue(mockGitApi),
    })),
    getPersonalAccessTokenHandler: vi.fn((pat: string) => ({
      prepareRequest: vi.fn(),
    })),
  };
});

describe('ADOResearcher', () => {
  let config: ADOConfig & { pat: string };

  beforeEach(() => {
    config = {
      organization: 'test-org',
      default_project: 'test-project',
      pat: 'test-pat-token',
    };
    vi.clearAllMocks();
  });

  it('should return success with both work items and pull requests', async () => {
    // Mock successful responses
    const { WebApi } = await import('azure-devops-node-api');
    const mockInstance = new WebApi('', {} as any);
    const witApi = await mockInstance.getWorkItemTrackingApi();
    const gitApi = await mockInstance.getGitApi();

    // Mock work item query
    vi.mocked(witApi.queryByWiql).mockResolvedValue({
      workItems: [{ id: 1 }, { id: 2 }],
    } as any);

    // Mock work item details
    vi.mocked(witApi.getWorkItems).mockResolvedValue([
      {
        id: 1,
        fields: {
          'System.Title': 'Test Work Item 1',
          'System.State': 'Active',
          'Microsoft.VSTS.Common.Priority': 1,
          'System.AssignedTo': { displayName: 'Test User' },
          'System.CreatedDate': new Date('2024-01-01'),
          'System.ChangedDate': new Date('2024-01-02'),
          'System.Tags': 'tag1; tag2',
          'System.IterationPath': 'Project\\Sprint 1',
        },
      },
      {
        id: 2,
        fields: {
          'System.Title': 'Test Work Item 2',
          'System.State': 'New',
          'Microsoft.VSTS.Common.Priority': 2,
          'System.CreatedDate': new Date('2024-01-03'),
          'System.ChangedDate': new Date('2024-01-04'),
          'System.Tags': '',
        },
      },
    ] as any);

    // Mock repositories
    vi.mocked(gitApi.getRepositories).mockResolvedValue([
      { id: 'repo1', name: 'test-repo' },
    ] as any);

    // Mock pull requests
    vi.mocked(gitApi.getPullRequests).mockResolvedValue([
      {
        pullRequestId: 101,
        title: 'Test PR',
        createdBy: { displayName: 'PR Author' },
        status: 1, // Active
        creationDate: new Date('2024-01-05'),
        repository: { name: 'test-repo' },
        targetRefName: 'refs/heads/main',
        reviewers: [
          {
            displayName: 'Reviewer 1',
            vote: 10, // Approved
            isRequired: true,
          },
          {
            displayName: 'Reviewer 2',
            vote: -5, // Waiting
            isRequired: false,
          },
        ],
      },
    ] as any);

    const researcher = new ADOResearcher(config);
    const result = await researcher.execute();

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const output = result.value;
    expect(output.source).toBe('azure-devops');
    expect(output.status).toBe('success');
    expect(output.data.workItems).toHaveLength(2);
    expect(output.data.pullRequests).toHaveLength(1);
    expect(output.metadata.itemsFound).toBe(3);
    expect(output.metadata.duration_ms).toBeGreaterThan(0);
    expect(output.metadata.timestamp).toBeInstanceOf(Date);

    // Verify work item structure
    expect(output.data.workItems[0]).toMatchObject({
      id: 1,
      title: 'Test Work Item 1',
      state: 'Active',
      priority: 1,
      assignedTo: 'Test User',
      tags: ['tag1', 'tag2'],
      sprintPath: 'Project\\Sprint 1',
    });

    // Verify PR structure
    expect(output.data.pullRequests[0]).toMatchObject({
      id: 101,
      title: 'Test PR',
      author: 'PR Author',
      status: 'active',
      repository: 'test-repo',
      targetBranch: 'refs/heads/main',
    });

    expect(output.data.pullRequests[0].reviewers).toHaveLength(2);
    expect(output.data.pullRequests[0].reviewers[0]).toMatchObject({
      name: 'Reviewer 1',
      vote: 'approved',
      required: true,
    });
  });

  it('should return partial when work items fail but PRs succeed', async () => {
    const { WebApi } = await import('azure-devops-node-api');
    const mockInstance = new WebApi('', {} as any);
    const witApi = await mockInstance.getWorkItemTrackingApi();
    const gitApi = await mockInstance.getGitApi();

    // Work items fail
    vi.mocked(witApi.queryByWiql).mockRejectedValue(new Error('Work item query failed'));

    // PRs succeed
    vi.mocked(gitApi.getRepositories).mockResolvedValue([{ id: 'repo1', name: 'test-repo' }] as any);
    vi.mocked(gitApi.getPullRequests).mockResolvedValue([
      {
        pullRequestId: 101,
        title: 'Test PR',
        createdBy: { displayName: 'Author' },
        status: 1,
        creationDate: new Date('2024-01-05'),
        repository: { name: 'test-repo' },
        targetRefName: 'refs/heads/main',
        reviewers: [],
      },
    ] as any);

    const researcher = new ADOResearcher(config);
    const result = await researcher.execute();

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const output = result.value;
    expect(output.status).toBe('partial');
    expect(output.data.workItems).toHaveLength(0);
    expect(output.data.pullRequests).toHaveLength(1);
    expect(output.errors).toBeDefined();
    expect(output.errors).toContain('Work item query failed');
  });

  it('should return partial when PRs fail but work items succeed', async () => {
    const { WebApi } = await import('azure-devops-node-api');
    const mockInstance = new WebApi('', {} as any);
    const witApi = await mockInstance.getWorkItemTrackingApi();
    const gitApi = await mockInstance.getGitApi();

    // Work items succeed
    vi.mocked(witApi.queryByWiql).mockResolvedValue({
      workItems: [{ id: 1 }],
    } as any);

    vi.mocked(witApi.getWorkItems).mockResolvedValue([
      {
        id: 1,
        fields: {
          'System.Title': 'Test Work Item',
          'System.State': 'Active',
          'Microsoft.VSTS.Common.Priority': 1,
          'System.CreatedDate': new Date('2024-01-01'),
          'System.ChangedDate': new Date('2024-01-02'),
          'System.Tags': '',
        },
      },
    ] as any);

    // PRs fail
    vi.mocked(gitApi.getRepositories).mockRejectedValue(new Error('Repository fetch failed'));

    const researcher = new ADOResearcher(config);
    const result = await researcher.execute();

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const output = result.value;
    expect(output.status).toBe('partial');
    expect(output.data.workItems).toHaveLength(1);
    expect(output.data.pullRequests).toHaveLength(0);
    expect(output.errors).toBeDefined();
    expect(output.errors).toContain('Repository fetch failed');
  });

  it('should return err when both work items and PRs fail', async () => {
    const { WebApi } = await import('azure-devops-node-api');
    const mockInstance = new WebApi('', {} as any);
    const witApi = await mockInstance.getWorkItemTrackingApi();
    const gitApi = await mockInstance.getGitApi();

    vi.mocked(witApi.queryByWiql).mockRejectedValue(new Error('Work items failed'));
    vi.mocked(gitApi.getRepositories).mockRejectedValue(new Error('PRs failed'));

    const researcher = new ADOResearcher(config);
    const result = await researcher.execute();

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;

    expect(result.error.message).toContain('Both work items and pull requests failed');
  });

  it('should handle missing optional fields in work items', async () => {
    const { WebApi } = await import('azure-devops-node-api');
    const mockInstance = new WebApi('', {} as any);
    const witApi = await mockInstance.getWorkItemTrackingApi();
    const gitApi = await mockInstance.getGitApi();

    vi.mocked(witApi.queryByWiql).mockResolvedValue({
      workItems: [{ id: 1 }],
    } as any);

    // Minimal work item with no optional fields
    vi.mocked(witApi.getWorkItems).mockResolvedValue([
      {
        id: 1,
        fields: {
          'System.Title': 'Minimal Work Item',
          'System.State': 'New',
          'Microsoft.VSTS.Common.Priority': 3,
          'System.CreatedDate': new Date('2024-01-01'),
          'System.ChangedDate': new Date('2024-01-01'),
          // No AssignedTo, Tags, or IterationPath
        },
      },
    ] as any);

    vi.mocked(gitApi.getRepositories).mockResolvedValue([]);

    const researcher = new ADOResearcher(config);
    const result = await researcher.execute();

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const output = result.value;
    const workItem = output.data.workItems[0];

    expect(workItem.id).toBe(1);
    expect(workItem.title).toBe('Minimal Work Item');
    expect(workItem.assignedTo).toBeUndefined();
    expect(workItem.tags).toEqual([]);
    expect(workItem.sprintPath).toBeUndefined();
  });

  it('should correctly map reviewer votes', async () => {
    const { WebApi } = await import('azure-devops-node-api');
    const mockInstance = new WebApi('', {} as any);
    const witApi = await mockInstance.getWorkItemTrackingApi();
    const gitApi = await mockInstance.getGitApi();

    vi.mocked(witApi.queryByWiql).mockResolvedValue({ workItems: [] } as any);
    vi.mocked(gitApi.getRepositories).mockResolvedValue([{ id: 'repo1', name: 'repo' }] as any);

    vi.mocked(gitApi.getPullRequests).mockResolvedValue([
      {
        pullRequestId: 1,
        title: 'PR with reviewers',
        createdBy: { displayName: 'Author' },
        status: 1,
        creationDate: new Date('2024-01-01'),
        repository: { name: 'repo' },
        targetRefName: 'refs/heads/main',
        reviewers: [
          { displayName: 'R1', vote: 10, isRequired: true },  // approved
          { displayName: 'R2', vote: 5, isRequired: false },  // approved-with-suggestions
          { displayName: 'R3', vote: 0, isRequired: false },  // none
          { displayName: 'R4', vote: -5, isRequired: true },  // waiting
          { displayName: 'R5', vote: -10, isRequired: false }, // rejected
        ],
      },
    ] as any);

    const researcher = new ADOResearcher(config);
    const result = await researcher.execute();

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const reviewers = result.value.data.pullRequests[0].reviewers;
    expect(reviewers[0].vote).toBe('approved');
    expect(reviewers[1].vote).toBe('approved-with-suggestions');
    expect(reviewers[2].vote).toBe('none');
    expect(reviewers[3].vote).toBe('waiting');
    expect(reviewers[4].vote).toBe('rejected');
  });

  it('should populate metadata correctly', async () => {
    const { WebApi } = await import('azure-devops-node-api');
    const mockInstance = new WebApi('', {} as any);
    const witApi = await mockInstance.getWorkItemTrackingApi();
    const gitApi = await mockInstance.getGitApi();

    vi.mocked(witApi.queryByWiql).mockResolvedValue({
      workItems: [{ id: 1 }, { id: 2 }],
    } as any);

    vi.mocked(witApi.getWorkItems).mockResolvedValue([
      {
        id: 1,
        fields: {
          'System.Title': 'WI1',
          'System.State': 'Active',
          'Microsoft.VSTS.Common.Priority': 1,
          'System.CreatedDate': new Date(),
          'System.ChangedDate': new Date(),
          'System.Tags': '',
        },
      },
      {
        id: 2,
        fields: {
          'System.Title': 'WI2',
          'System.State': 'Active',
          'Microsoft.VSTS.Common.Priority': 1,
          'System.CreatedDate': new Date(),
          'System.ChangedDate': new Date(),
          'System.Tags': '',
        },
      },
    ] as any);

    vi.mocked(gitApi.getRepositories).mockResolvedValue([{ id: 'repo1', name: 'repo' }] as any);
    vi.mocked(gitApi.getPullRequests).mockResolvedValue([
      {
        pullRequestId: 1,
        title: 'PR',
        createdBy: { displayName: 'Author' },
        status: 1,
        creationDate: new Date(),
        repository: { name: 'repo' },
        targetRefName: 'refs/heads/main',
        reviewers: [],
      },
    ] as any);

    const researcher = new ADOResearcher(config);
    const result = await researcher.execute();

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const { metadata } = result.value;
    expect(metadata.timestamp).toBeInstanceOf(Date);
    expect(metadata.duration_ms).toBeGreaterThan(0);
    expect(metadata.itemsFound).toBe(3); // 2 work items + 1 PR
  });

  it('should have correct researcher name', () => {
    const researcher = new ADOResearcher(config);
    expect(researcher.name).toBe('ado-researcher');
  });
});
