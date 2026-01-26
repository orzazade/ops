import { Result } from 'neverthrow';

/**
 * Context provided to each investigator for ticket research.
 * Contains ticket information and repository paths to search.
 */
export interface InvestigationContext {
  ticketId: number;
  project: string;
  organization: string;
  repoPaths: string[];
}

/**
 * Interface for investigator implementations.
 * All investigators must implement this contract for parallel execution.
 */
export interface Investigator<T> {
  name: string;
  execute(context: InvestigationContext): Promise<Result<T, Error>>;
}

/**
 * A single code finding from repository search.
 * Represents a specific location in code with confidence level.
 */
export interface CodeFinding {
  file: string;
  line: number;
  content: string;
  context: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  relevance: string;
}

/**
 * Results from code investigation across repositories.
 * Groups findings by type and tracks which repos were searched.
 */
export interface CodeFindings {
  implementations: CodeFinding[];
  references: CodeFinding[];
  tests: CodeFinding[];
  reposSearched: string[];
  searchQueries: Array<{ pattern: string; glob: string; description: string }>;
}

/**
 * Work item with expanded relations data.
 * Includes fields needed for detailed ticket analysis.
 */
export interface WorkItemWithRelations {
  id: number;
  title: string;
  description: string;
  acceptanceCriteria: string;
  state: string;
  type: string;
  areaPath: string;
  tags: string[];
  relatedIds: number[];
  relationTypes: Map<number, string>;
}

/**
 * A related work item with relationship context.
 * Tracks how this item relates to the investigated ticket.
 */
export interface RelatedWorkItem {
  id: number;
  title: string;
  type: string;
  state: string;
  relationshipType: string;
  relevance: string;
}

/**
 * Results from ticket investigation in Azure DevOps.
 * Includes the ticket itself, related items, and analysis.
 */
export interface TicketFindings {
  workItem: WorkItemWithRelations;
  relatedWorkItems: RelatedWorkItem[];
  similarTickets: RelatedWorkItem[];
  hasDetailedDescription: boolean;
  hasAcceptanceCriteria: boolean;
  keywords: string[];
}

/**
 * A single wiki page finding.
 * Represents relevant documentation with confidence level.
 */
export interface WikiFinding {
  title: string;
  path: string;
  relevance: string;
  snippet: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Results from wiki/documentation investigation.
 * Contains found pages and search terms used.
 */
export interface WikiFindings {
  pages: WikiFinding[];
  searchTermsUsed: string[];
  searchQueries: Array<{ terms: string[]; description: string }>;
}

/**
 * Combined results from all investigators.
 * Each field contains a Result for graceful error handling.
 */
export interface InvestigationResults {
  code: Result<CodeFindings, Error>;
  tickets: Result<TicketFindings, Error>;
  wiki: Result<WikiFindings, Error>;
}

/**
 * Summary of investigation with actionable recommendations.
 * Used to generate draft updates for the ticket.
 */
export interface InvestigationSummary {
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedChanges: WorkItemUpdate;
  missingInfo: string[];
  relatedItems: Array<{ id: number; type: string; relevance: string }>;
  codeReferences: CodeFinding[];
}

/**
 * Proposed updates to apply to a work item.
 * All fields optional - only update what's missing or incorrect.
 */
export interface WorkItemUpdate {
  description?: string;
  acceptanceCriteria?: string;
  tags?: string[];
  links?: Array<{ url: string; comment: string }>;
}
