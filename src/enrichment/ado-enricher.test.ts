/**
 * Tests for ADO work item enricher.
 * Uses mocked ADOClient to avoid real API calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ADOEnricher } from './ado-enricher.js';
import type { ADOClient } from '../azure/client.js';
import type { WorkItemWithRelations } from '../investigators/types.js';

// Mock ADOClient
const createMockClient = (): ADOClient => {
  const mockGet = vi.fn();
  const mockGetWorkItemApi = vi.fn();
  const mockGetWorkItems = vi.fn();
  const mockGetWorkItem = vi.fn();

  return {
    fetchWorkItemWithRelations: vi.fn(),
    config: {
      project: 'TestProject',
      organization: 'TestOrg',
    },
    connection: {
      rest: {
        client: {
          get: mockGet,
        },
      },
    },
    getWorkItemApi: mockGetWorkItemApi.mockResolvedValue({
      getWorkItems: mockGetWorkItems,
      getWorkItem: mockGetWorkItem,
    }),
  } as any;
};

describe('ADOEnricher', () => {
  let enricher: ADOEnricher;
  let mockClient: ADOClient;

  beforeEach(() => {
    mockClient = createMockClient();
    enricher = new ADOEnricher(mockClient);
  });

  describe('enrich', () => {
    it('enriches work item with full data', async () => {
      const mockWorkItem: WorkItemWithRelations = {
        id: 123,
        title: 'Test Work Item',
        description: '<div>Full description here</div>',
        acceptanceCriteria: '',
        state: 'Active',
        type: 'User Story',
        areaPath: 'Project\\Team',
        tags: ['bug', 'urgent'],
        relatedIds: [456, 789],
        relationTypes: new Map([
          [456, 'System.LinkTypes.Hierarchy-Reverse'],
          [789, 'System.LinkTypes.Dependency-Forward'],
        ]),
      };

      const mockComments = {
        comments: [
          {
            id: 1,
            text: 'Latest comment',
            createdDate: '2026-01-27T10:00:00Z',
            createdBy: { displayName: 'User One' },
          },
          {
            id: 2,
            text: 'Second comment',
            createdDate: '2026-01-26T10:00:00Z',
            createdBy: { displayName: 'User Two' },
          },
        ],
        count: 2,
      };

      const mockRelatedItems = [
        {
          id: 456,
          fields: { 'System.Title': 'Parent Story' },
        },
        {
          id: 789,
          fields: { 'System.Title': 'Blocker Task' },
        },
      ];

      // Setup mocks
      vi.mocked(mockClient.fetchWorkItemWithRelations).mockResolvedValue(mockWorkItem);

      // Mock REST API for comments
      const mockConnection = mockClient as any;
      mockConnection.connection.rest.client.get = vi.fn().mockResolvedValue({
        result: mockComments,
      });

      // Mock getWorkItems for relations
      mockConnection.getWorkItemApi = vi.fn().mockResolvedValue({
        getWorkItems: vi.fn().mockResolvedValue(mockRelatedItems),
      });

      const result = await enricher.enrich(123);

      expect(result).toMatchObject({
        id: 123,
        title: 'Test Work Item',
        description: '<div>Full description here</div>',
        comments: [
          {
            id: 1,
            text: 'Latest comment',
            createdDate: '2026-01-27T10:00:00Z',
            createdBy: 'User One',
          },
          {
            id: 2,
            text: 'Second comment',
            createdDate: '2026-01-26T10:00:00Z',
            createdBy: 'User Two',
          },
        ],
        dueDate: null,
        sprintPath: null,
        tags: ['bug', 'urgent'],
        areaPath: 'Project\\Team',
        relations: [
          {
            id: 456,
            title: 'Parent Story',
            type: 'parent',
          },
          {
            id: 789,
            title: 'Blocker Task',
            type: 'blocker',
          },
        ],
      });
    });

    it('handles work item with no description', async () => {
      const mockWorkItem: WorkItemWithRelations = {
        id: 123,
        title: 'Test Work Item',
        description: '',
        acceptanceCriteria: '',
        state: 'Active',
        type: 'Task',
        areaPath: 'Project\\Team',
        tags: [],
        relatedIds: [],
        relationTypes: new Map(),
      };

      vi.mocked(mockClient.fetchWorkItemWithRelations).mockResolvedValue(mockWorkItem);

      const mockConnection = mockClient as any;
      mockConnection.connection.rest.client.get = vi.fn().mockResolvedValue({
        result: { comments: [], count: 0 },
      });

      const result = await enricher.enrich(123);

      expect(result.description).toBeNull();
    });

    it('handles work item with no comments', async () => {
      const mockWorkItem: WorkItemWithRelations = {
        id: 123,
        title: 'Test Work Item',
        description: 'Some description',
        acceptanceCriteria: '',
        state: 'Active',
        type: 'Task',
        areaPath: 'Project\\Team',
        tags: [],
        relatedIds: [],
        relationTypes: new Map(),
      };

      vi.mocked(mockClient.fetchWorkItemWithRelations).mockResolvedValue(mockWorkItem);

      const mockConnection = mockClient as any;
      mockConnection.connection.rest.client.get = vi.fn().mockResolvedValue({
        result: { comments: [], count: 0 },
      });

      const result = await enricher.enrich(123);

      expect(result.comments).toEqual([]);
    });

    it('resolves relation titles correctly', async () => {
      const mockWorkItem: WorkItemWithRelations = {
        id: 123,
        title: 'Test Work Item',
        description: 'Description',
        acceptanceCriteria: '',
        state: 'Active',
        type: 'Task',
        areaPath: 'Project\\Team',
        tags: [],
        relatedIds: [456, 789, 101],
        relationTypes: new Map([
          [456, 'System.LinkTypes.Hierarchy-Reverse'], // parent
          [789, 'System.LinkTypes.Hierarchy-Forward'], // child
          [101, 'System.LinkTypes.Related'],
        ]),
      };

      const mockRelatedItems = [
        { id: 456, fields: { 'System.Title': 'Parent Item' } },
        { id: 789, fields: { 'System.Title': 'Child Item' } },
        { id: 101, fields: { 'System.Title': 'Related Item' } },
      ];

      vi.mocked(mockClient.fetchWorkItemWithRelations).mockResolvedValue(mockWorkItem);

      const mockConnection = mockClient as any;
      mockConnection.connection.rest.client.get = vi.fn().mockResolvedValue({
        result: { comments: [], count: 0 },
      });
      mockConnection.getWorkItemApi = vi.fn().mockResolvedValue({
        getWorkItems: vi.fn().mockResolvedValue(mockRelatedItems),
      });

      const result = await enricher.enrich(123);

      expect(result.relations).toEqual([
        { id: 456, title: 'Parent Item', type: 'parent' },
        { id: 789, title: 'Child Item', type: 'child' },
        { id: 101, title: 'Related Item', type: 'related' },
      ]);
    });

    it('handles API error gracefully', async () => {
      vi.mocked(mockClient.fetchWorkItemWithRelations).mockRejectedValue(
        new Error('API connection failed')
      );

      await expect(enricher.enrich(123)).rejects.toThrow('Failed to enrich work item 123');
    });

    it('fetches comments in descending order (most recent first)', async () => {
      const mockWorkItem: WorkItemWithRelations = {
        id: 123,
        title: 'Test Work Item',
        description: 'Description',
        acceptanceCriteria: '',
        state: 'Active',
        type: 'Task',
        areaPath: 'Project\\Team',
        tags: [],
        relatedIds: [],
        relationTypes: new Map(),
      };

      const mockComments = {
        comments: [
          {
            id: 3,
            text: 'Most recent',
            createdDate: '2026-01-27T12:00:00Z',
            createdBy: { displayName: 'User' },
          },
          {
            id: 2,
            text: 'Middle',
            createdDate: '2026-01-27T11:00:00Z',
            createdBy: { displayName: 'User' },
          },
          {
            id: 1,
            text: 'Oldest',
            createdDate: '2026-01-27T10:00:00Z',
            createdBy: { displayName: 'User' },
          },
        ],
        count: 3,
      };

      vi.mocked(mockClient.fetchWorkItemWithRelations).mockResolvedValue(mockWorkItem);

      const mockConnection = mockClient as any;
      const mockGet = vi.fn().mockResolvedValue({
        result: mockComments,
      });
      mockConnection.connection.rest.client.get = mockGet;

      await enricher.enrich(123);

      // Verify that comments endpoint was called with order=desc
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('order=desc'),
        expect.anything()
      );
    });

    it('extracts due date and sprint path from fields', async () => {
      const mockWorkItem: WorkItemWithRelations = {
        id: 123,
        title: 'Test Work Item',
        description: 'Description',
        acceptanceCriteria: '',
        state: 'Active',
        type: 'Task',
        areaPath: 'Project\\Team',
        tags: [],
        relatedIds: [],
        relationTypes: new Map(),
      };

      // Simulate ADO client returning work item with additional fields
      vi.mocked(mockClient.fetchWorkItemWithRelations).mockResolvedValue(mockWorkItem);

      const mockConnection = mockClient as any;
      mockConnection.connection.rest.client.get = vi.fn().mockResolvedValue({
        result: { comments: [], count: 0 },
      });

      // Mock getWorkItem to return fields
      mockConnection.getWorkItemApi = vi.fn().mockResolvedValue({
        getWorkItem: vi.fn().mockResolvedValue({
          id: 123,
          fields: {
            'Microsoft.VSTS.Scheduling.DueDate': '2026-02-01T00:00:00Z',
            'System.IterationPath': 'Project\\Sprint 213',
          },
        }),
      });

      const result = await enricher.enrich(123);

      expect(result.dueDate).toBe('2026-02-01T00:00:00Z');
      expect(result.sprintPath).toBe('Project\\Sprint 213');
    });
  });
});
