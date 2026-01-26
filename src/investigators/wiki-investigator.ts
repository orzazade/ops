/**
 * Wiki investigator for preparing documentation search queries.
 * Extracts search terms from work item and prepares queries for skill execution.
 */

import { ok, err, Result } from 'neverthrow';
import type { ADOClient } from '../azure/client.js';
import type {
  Investigator,
  InvestigationContext,
  WikiFindings,
} from './types.js';

/**
 * Investigator that prepares wiki/documentation search queries.
 * Does NOT directly search wiki - prepares queries for Claude Code skill to execute.
 */
export class WikiInvestigator implements Investigator<WikiFindings> {
  readonly name = 'wiki-investigator';

  constructor(
    private adoClient: ADOClient,
    private organization: string,
    private project: string
  ) {}

  /**
   * Execute wiki investigation for given context.
   * Extracts search terms and prepares queries for skill to use.
   */
  async execute(context: InvestigationContext): Promise<Result<WikiFindings, Error>> {
    try {
      // Fetch work item to extract search terms
      const workItem = await this.adoClient.fetchWorkItemWithRelations(context.ticketId);

      // Extract search terms from area path
      const areaSegments = this.extractAreaSegments(workItem.areaPath);

      // Extract PascalCase words (component names, class names, etc.)
      const pascalCaseWords = this.extractPascalCaseWords(workItem.title, workItem.description);

      // Extract technical terms
      const technicalTerms = this.extractTechnicalTerms(workItem.title, workItem.description);

      // Build search queries for wiki
      const searchQueries = [];

      if (areaSegments.length > 0) {
        searchQueries.push({
          terms: areaSegments,
          description: 'Area-related documentation',
        });
      }

      if (technicalTerms.length > 0) {
        searchQueries.push({
          terms: technicalTerms,
          description: 'Technical documentation',
        });
      }

      if (pascalCaseWords.length > 0) {
        searchQueries.push({
          terms: pascalCaseWords,
          description: 'Component documentation',
        });
      }

      // Collect all unique terms
      const allTerms = new Set<string>([
        ...areaSegments,
        ...pascalCaseWords,
        ...technicalTerms,
      ]);

      const findings: WikiFindings = {
        pages: [], // Populated later by skill
        searchTermsUsed: Array.from(allTerms),
        searchQueries,
      };

      return ok(findings);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Wiki investigation failed'));
    }
  }

  /**
   * Extract area path segments for area-based documentation search.
   * Example: "Orion\\CPQ" -> ["Orion", "CPQ"]
   */
  private extractAreaSegments(areaPath: string): string[] {
    if (!areaPath) return [];

    const segments = areaPath.split('\\').filter(seg => seg.length > 0);
    // Return segments, excluding common root segments like project name
    return segments.slice(-2); // Last 2 segments are most relevant
  }

  /**
   * Extract PascalCase words from content (component names, class names).
   * Example: "PricingService" from ticket title
   */
  private extractPascalCaseWords(title: string, description: string): string[] {
    const content = `${title} ${description}`;
    const keywords = new Set<string>();

    // Extract PascalCase words (class names, components, etc.)
    const pascalPattern = /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g;
    const pascalMatches = content.matchAll(pascalPattern);
    for (const match of pascalMatches) {
      keywords.add(match[0]);
    }

    return Array.from(keywords).slice(0, 5); // Limit to 5 most relevant
  }

  /**
   * Extract technical terms from content (service, api, controller, etc.).
   */
  private extractTechnicalTerms(title: string, description: string): string[] {
    const content = `${title} ${description}`;
    const keywords = new Set<string>();

    // Extract technical terms
    const technicalPattern = /\b(?:service|controller|api|endpoint|repository|component|database|table|function|method|architecture)\b/gi;
    const techMatches = content.matchAll(technicalPattern);
    for (const match of techMatches) {
      keywords.add(match[0].toLowerCase());
    }

    return Array.from(keywords).slice(0, 5); // Limit to 5 most relevant
  }
}
