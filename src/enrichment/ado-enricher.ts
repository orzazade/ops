/**
 * ADO work item enricher.
 * Fetches full context for work items including description, comments, and relations.
 */

import type { ADOClient } from '../azure/client.js';
import type { WorkItemWithRelations } from '../investigators/types.js';
import type { EnrichedWorkItem, ADOComment, EnrichedRelation } from './types.js';

/**
 * Comment response from ADO REST API.
 */
interface ADOCommentResponse {
  comments: Array<{
    id: number;
    text: string;
    createdDate: string;
    createdBy: {
      displayName: string;
    };
  }>;
  count: number;
}

/**
 * Enricher for Azure DevOps work items.
 * Fetches full context including description, comments, metadata, and relations.
 */
export class ADOEnricher {
  constructor(private client: ADOClient) {}

  /**
   * Enrich a work item with full context.
   *
   * @param workItemId - Work item ID to enrich
   * @returns EnrichedWorkItem with full context
   * @throws Error if enrichment fails
   */
  async enrich(workItemId: number): Promise<EnrichedWorkItem> {
    try {
      // Fetch work item with relations
      const workItem = await this.client.fetchWorkItemWithRelations(workItemId);

      // Fetch comments via REST API
      const comments = await this.fetchComments(workItemId);

      // Fetch additional fields (due date, sprint path)
      const additionalFields = await this.fetchAdditionalFields(workItemId);

      // Resolve relation titles
      const relations = await this.resolveRelationTitles(
        workItem.relatedIds,
        workItem.relationTypes
      );

      return {
        id: workItem.id,
        title: workItem.title,
        description: workItem.description || null,
        comments,
        dueDate: additionalFields.dueDate,
        sprintPath: additionalFields.sprintPath,
        tags: workItem.tags,
        areaPath: workItem.areaPath,
        relations,
      };
    } catch (error) {
      throw new Error(
        `Failed to enrich work item ${workItemId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Fetch last 5 comments via REST API.
   * Comments API is not available in the TypeScript client.
   *
   * @param workItemId - Work item ID
   * @returns Array of comments, ordered by date descending (most recent first)
   */
  private async fetchComments(workItemId: number): Promise<ADOComment[]> {
    try {
      const client = this.client as any;
      const project = client.config?.project || '';
      const organization = client.config?.organization || '';

      // REST endpoint for comments
      // Note: order=desc ensures most recent comments first
      const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/workItems/${workItemId}/comments?$top=5&order=desc&api-version=7.1-preview.4`;

      const response = await client.connection.rest.client.get(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = response.result as ADOCommentResponse;

      return data.comments.map((comment) => ({
        id: comment.id,
        text: comment.text,
        createdDate: comment.createdDate,
        createdBy: comment.createdBy.displayName,
      }));
    } catch (error) {
      // Gracefully handle comments fetch failure - return empty array
      // Some work items may not have comments endpoint accessible
      return [];
    }
  }

  /**
   * Fetch additional fields not included in fetchWorkItemWithRelations.
   *
   * @param workItemId - Work item ID
   * @returns Object with dueDate and sprintPath
   */
  private async fetchAdditionalFields(
    workItemId: number
  ): Promise<{ dueDate: string | null; sprintPath: string | null }> {
    try {
      const client = this.client as any;
      const witApi = await client.getWorkItemApi();

      const workItem = await witApi.getWorkItem(
        workItemId,
        [
          'Microsoft.VSTS.Scheduling.DueDate',
          'System.IterationPath',
        ],
        undefined,
        undefined,
        client.config?.project
      );

      return {
        dueDate: workItem.fields?.['Microsoft.VSTS.Scheduling.DueDate'] || null,
        sprintPath: workItem.fields?.['System.IterationPath'] || null,
      };
    } catch (error) {
      // Gracefully handle - return nulls
      return {
        dueDate: null,
        sprintPath: null,
      };
    }
  }

  /**
   * Resolve relation titles by batch fetching related work items.
   *
   * @param relatedIds - Array of related work item IDs
   * @param relationTypes - Map of ID to relation type string
   * @returns Array of enriched relations with titles
   */
  private async resolveRelationTitles(
    relatedIds: number[],
    relationTypes: Map<number, string>
  ): Promise<EnrichedRelation[]> {
    if (relatedIds.length === 0) {
      return [];
    }

    try {
      const client = this.client as any;
      const witApi = await client.getWorkItemApi();

      // Batch fetch related work items
      const relatedItems = await witApi.getWorkItems(
        relatedIds,
        ['System.Title'],
        undefined,
        undefined,
        undefined,
        client.config?.project
      );

      // Map to enriched relations
      return relatedItems.map((item: any) => ({
        id: item.id,
        title: item.fields?.['System.Title'] || 'Unknown',
        type: this.mapRelationType(relationTypes.get(item.id) || ''),
      }));
    } catch (error) {
      // Gracefully handle - return relations without titles
      return relatedIds.map((id) => ({
        id,
        title: 'Unknown',
        type: this.mapRelationType(relationTypes.get(id) || ''),
      }));
    }
  }

  /**
   * Map ADO relation type string to our simplified relation type.
   *
   * @param adoRelationType - ADO relation type (e.g., "System.LinkTypes.Hierarchy-Reverse")
   * @returns Simplified relation type
   */
  private mapRelationType(
    adoRelationType: string
  ): EnrichedRelation['type'] {
    if (adoRelationType.includes('Hierarchy-Reverse')) {
      return 'parent';
    }
    if (adoRelationType.includes('Hierarchy-Forward')) {
      return 'child';
    }
    if (adoRelationType.includes('Dependency-Forward')) {
      return 'blocker';
    }
    if (adoRelationType.includes('Dependency-Reverse')) {
      return 'blocked-by';
    }
    return 'related';
  }
}
