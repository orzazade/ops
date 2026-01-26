import { ok, Result } from 'neverthrow';
import type {
  Investigator,
  InvestigationContext,
  CodeFindings,
} from './types.js';

/**
 * Extracts keywords from work item title and description.
 * Looks for PascalCase, camelCase, and technical terms.
 */
export function extractKeywords(title: string, description: string): string[] {
  const content = `${title} ${description}`;
  const keywords = new Set<string>();

  // Pattern 1: PascalCase (class names, etc.)
  const pascalPattern = /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g;
  const pascalMatches = content.matchAll(pascalPattern);
  for (const match of pascalMatches) {
    keywords.add(match[0]);
  }

  // Pattern 2: camelCase (method names, variables)
  const camelPattern = /\b[a-z]+(?:[A-Z][a-z]+)+\b/g;
  const camelMatches = content.matchAll(camelPattern);
  for (const match of camelMatches) {
    keywords.add(match[0]);
  }

  // Pattern 3: Technical terms after keywords
  const technicalPattern = /\b(?:service|controller|repository|component|api|endpoint|database|table|function|method)\s+(\w+)/gi;
  const techMatches = content.matchAll(technicalPattern);
  for (const match of techMatches) {
    if (match[1]) {
      keywords.add(match[1]);
    }
  }

  // Deduplicate and limit to 10 keywords
  return Array.from(keywords).slice(0, 10);
}

/**
 * Code investigator prepares search queries for Claude Code's Grep tool.
 * Does not directly execute searches - that's done by the skill using Grep tool.
 */
export class CodeInvestigator implements Investigator<CodeFindings> {
  readonly name = 'code-investigator';

  constructor(private repoPaths: string[]) {}

  /**
   * Prepares code search queries based on work item keywords.
   * The skill will use Claude Code's Grep tool to execute these searches.
   */
  async execute(
    context: InvestigationContext
  ): Promise<Result<CodeFindings, Error>> {
    // For this phase, we prepare search queries but don't execute them
    // The skill will use Claude Code's Grep tool to actually search

    // Build search queries for each keyword
    const searchQueries: Array<{
      pattern: string;
      glob: string;
      description: string;
    }> = [];

    // Extract keywords from context (would normally fetch work item)
    // For now, we'll prepare generic patterns
    const keywords = ['class', 'function', 'method']; // Placeholder

    for (const keyword of keywords) {
      // Class definition search
      searchQueries.push({
        pattern: `class.*${keyword}`,
        glob: '**/*.{ts,cs,js}',
        description: `Class definition for ${keyword}`,
      });

      // Function call search
      searchQueries.push({
        pattern: `${keyword}\\(`,
        glob: '**/*.{ts,cs,js}',
        description: `Function calls to ${keyword}`,
      });

      // Test file search
      searchQueries.push({
        pattern: keyword,
        glob: '**/*.{test,spec}.{ts,js}',
        description: `Tests for ${keyword}`,
      });
    }

    // Return findings structure with search queries
    // The skill will populate implementations, references, and tests
    const findings: CodeFindings = {
      implementations: [],
      references: [],
      tests: [],
      reposSearched: context.repoPaths,
      searchQueries,
    };

    return ok(findings);
  }
}
