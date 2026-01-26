/**
 * Ticket investigator for analyzing work items and finding related tickets.
 * Fetches work item with relations, extracts keywords, and searches similar tickets.
 */

import { ok, err, Result } from 'neverthrow';
import type { WorkItem } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';
import type { ADOClient } from '../azure/client.js';
import type {
  Investigator,
  InvestigationContext,
  TicketFindings,
  RelatedWorkItem,
} from './types.js';

/**
 * Investigator that analyzes Azure DevOps work items.
 * Fetches relations, finds similar tickets, and assesses quality.
 */
export class TicketInvestigator implements Investigator<TicketFindings> {
  readonly name = 'ticket-investigator';

  constructor(private adoClient: ADOClient) {}

  /**
   * Execute ticket investigation for given context.
   * Fetches work item with relations, finds similar tickets, analyzes quality.
   */
  async execute(context: InvestigationContext): Promise<Result<TicketFindings, Error>> {
    try {
      // Fetch work item with relations expanded
      const workItem = await this.adoClient.fetchWorkItemWithRelations(context.ticketId);

      // Extract keywords for similarity search
      const keywords = this.extractKeywords(workItem.title, workItem.description);

      // Fetch related work items (from explicit relations)
      const relatedWorkItems: RelatedWorkItem[] = [];

      if (workItem.relatedIds.length > 0) {
        const relatedItems = await this.fetchRelatedWorkItems(workItem.relatedIds, context.project);

        // Map to RelatedWorkItem with relationship type
        for (const item of relatedItems) {
          const relationshipType = workItem.relationTypes.get(item.id || 0) || 'Unknown';
          relatedWorkItems.push({
            id: item.id || 0,
            title: item.fields?.['System.Title'] || 'Untitled',
            type: item.fields?.['System.WorkItemType'] || 'Unknown',
            state: item.fields?.['System.State'] || 'Unknown',
            relationshipType,
            relevance: this.determineRelevance(relationshipType),
          });
        }
      }

      // Search for similar tickets using keywords
      const similarTickets: RelatedWorkItem[] = [];
      if (keywords.length > 0) {
        const similarItems = await this.adoClient.searchSimilarWorkItems(
          keywords.slice(0, 5), // Limit to top 5 keywords
          workItem.areaPath
        );

        // Exclude the current ticket and already-related items
        const relatedIdSet = new Set(workItem.relatedIds);
        relatedIdSet.add(context.ticketId);

        for (const item of similarItems) {
          if (!relatedIdSet.has(item.id || 0)) {
            similarTickets.push({
              id: item.id || 0,
              title: item.fields?.['System.Title'] || 'Untitled',
              type: item.fields?.['System.WorkItemType'] || 'Unknown',
              state: item.fields?.['System.State'] || 'Unknown',
              relationshipType: 'Similar',
              relevance: 'similar-content',
            });
          }
        }
      }

      // Analyze ticket quality
      const hasDetailedDescription = workItem.description.length > 100;
      const hasAcceptanceCriteria = workItem.acceptanceCriteria.length > 0;

      const findings: TicketFindings = {
        workItem,
        relatedWorkItems,
        similarTickets,
        hasDetailedDescription,
        hasAcceptanceCriteria,
        keywords,
      };

      return ok(findings);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Ticket investigation failed'));
    }
  }

  /**
   * Extract keywords from title and description for similarity search.
   * Focuses on PascalCase words and technical terms.
   */
  private extractKeywords(title: string, description: string): string[] {
    const content = `${title} ${description}`;
    const keywords = new Set<string>();

    // Extract PascalCase words (class names, components, etc.)
    const pascalPattern = /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g;
    const pascalMatches = content.matchAll(pascalPattern);
    for (const match of pascalMatches) {
      keywords.add(match[0]);
    }

    // Extract technical terms
    const technicalPattern = /\b(?:service|controller|api|endpoint|repository|component|database|table|function|method)\b/gi;
    const techMatches = content.matchAll(technicalPattern);
    for (const match of techMatches) {
      keywords.add(match[0].toLowerCase());
    }

    return Array.from(keywords).slice(0, 5); // Limit to 5 most relevant
  }

  /**
   * Fetch related work items by IDs.
   * Batch fetches work items using ADO API.
   */
  private async fetchRelatedWorkItems(ids: number[], project: string): Promise<WorkItem[]> {
    const witApi = await (this.adoClient as any).getWorkItemApi();

    const workItems = await witApi.getWorkItems(
      ids,
      ['System.Id', 'System.Title', 'System.WorkItemType', 'System.State'],
      undefined,
      undefined,
      undefined,
      project
    );

    return workItems || [];
  }

  /**
   * Determine relevance level based on relationship type.
   * Maps ADO relation types to relevance categories.
   */
  private determineRelevance(relationshipType: string): string {
    // Relation types from Azure DevOps
    if (relationshipType.includes('Parent') || relationshipType.includes('Child')) {
      return 'hierarchical';
    }
    if (relationshipType.includes('Related')) {
      return 'related';
    }
    if (relationshipType.includes('Duplicate')) {
      return 'duplicate';
    }
    return 'linked';
  }
}
