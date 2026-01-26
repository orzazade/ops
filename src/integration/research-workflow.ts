/**
 * Research workflow for deep-dive ticket investigation.
 * Coordinates repository detection, cloning, investigator execution, and finding synthesis.
 */

import { Result, ok, err } from 'neverthrow';
import { ADOClient } from '../azure/client.js';
import type {
  InvestigationContext,
  InvestigationResults,
  InvestigationSummary,
  WorkItemWithRelations,
  WorkItemUpdate,
} from '../investigators/types.js';
import { InvestigationOrchestrator } from '../investigators/orchestrator.js';
import { CodeInvestigator } from '../investigators/code-investigator.js';
import { TicketInvestigator } from '../investigators/ticket-investigator.js';
import { WikiInvestigator } from '../investigators/wiki-investigator.js';
import { RepoCloner, detectRepoReferences } from '../git/cloner.js';

/**
 * Configuration for research workflow.
 */
export interface ResearchWorkflowConfig {
  ticketId: number;
  project: string;
  organization: string;
  pat: string;
  repoPaths: string[];
  baseClonePath?: string;
}

/**
 * Output from research workflow execution.
 * Includes investigation results, synthesized summary, and repos cloned.
 */
export interface ResearchWorkflowOutput {
  investigation: InvestigationResults;
  summary: InvestigationSummary;
  workItem: WorkItemWithRelations;
  reposCloned: string[];
}

/**
 * Synthesizes investigation findings into actionable summary.
 * Calculates confidence, extracts missing info, collects related items.
 *
 * @param results - Investigation results from all investigators
 * @param workItem - Work item being investigated
 * @returns Investigation summary with confidence and recommendations
 */
export function synthesizeFindings(
  results: InvestigationResults,
  workItem: WorkItemWithRelations
): InvestigationSummary {
  const missingInfo: string[] = [];
  const relatedItems: Array<{ id: number; type: string; relevance: string }> = [];

  // Analyze ticket findings
  if (results.tickets.isOk()) {
    const ticketData = results.tickets.value;

    if (!ticketData.hasDetailedDescription) {
      missingInfo.push('Work item description lacks implementation details');
    }

    if (!ticketData.hasAcceptanceCriteria) {
      missingInfo.push('Work item has no acceptance criteria defined');
    }

    // Collect related work items
    relatedItems.push(
      ...ticketData.relatedWorkItems.map((wi) => ({
        id: wi.id,
        type: wi.type,
        relevance: wi.relationshipType,
      }))
    );

    // Collect similar tickets
    relatedItems.push(
      ...ticketData.similarTickets.map((wi) => ({
        id: wi.id,
        type: wi.type,
        relevance: 'similar',
      }))
    );
  }

  // Analyze code findings
  const codeReferences = results.code.isOk()
    ? [...results.code.value.implementations, ...results.code.value.references]
    : [];

  if (results.code.isOk() && codeReferences.length === 0) {
    missingInfo.push('No related code implementations found');
  }

  // Calculate confidence based on success count
  const successCount = [
    results.code.isOk(),
    results.tickets.isOk(),
    results.wiki.isOk(),
  ].filter(Boolean).length;

  const confidence: 'HIGH' | 'MEDIUM' | 'LOW' =
    successCount === 3 ? 'HIGH' : successCount === 2 ? 'MEDIUM' : 'LOW';

  // Build suggested changes (initially empty, to be filled by skill)
  const suggestedChanges: WorkItemUpdate = {
    description: undefined,
    acceptanceCriteria: undefined,
    tags: [],
    links: [],
  };

  return {
    confidence,
    suggestedChanges,
    missingInfo,
    relatedItems,
    codeReferences,
  };
}

/**
 * Research workflow orchestrator.
 * Manages full investigation lifecycle from repo detection to findings synthesis.
 */
export class ResearchWorkflow {
  constructor(private config: ResearchWorkflowConfig) {}

  /**
   * Execute the research workflow.
   * Steps:
   * 1. Fetch work item with relations
   * 2. Detect repo references from work item
   * 3. Check if repos are local, clone if needed
   * 4. Create and execute investigators in parallel
   * 5. Synthesize findings into summary
   *
   * @returns Result with ResearchWorkflowOutput or Error
   */
  async execute(): Promise<Result<ResearchWorkflowOutput, Error>> {
    try {
      console.log(
        `[ResearchWorkflow] Starting investigation for ticket #${this.config.ticketId}...`
      );

      // Create ADO client
      const adoClient = new ADOClient({
        organization: this.config.organization,
        project: this.config.project,
        pat: this.config.pat,
      });

      // Fetch work item with relations
      console.log('[ResearchWorkflow] Fetching work item with relations...');
      const workItem = await adoClient.fetchWorkItemWithRelations(
        this.config.ticketId
      );
      console.log(`[ResearchWorkflow] Work item: ${workItem.title}`);

      // Detect repo references from work item
      const repoRefs = detectRepoReferences(
        workItem.description,
        workItem.title,
        this.config.organization
      );

      console.log(
        `[ResearchWorkflow] Detected ${repoRefs.length} repo references`
      );

      // Track available repo paths (start with provided paths)
      const availableRepoPaths = [...this.config.repoPaths];
      const reposCloned: string[] = [];

      // Check each detected repo and clone if needed
      if (repoRefs.length > 0) {
        const cloner = new RepoCloner(
          this.config.baseClonePath || '~/Projects/appxite'
        );

        for (const repoRef of repoRefs) {
          // Check if already local
          if (cloner.isRepoLocal(repoRef.name)) {
            console.log(`[ResearchWorkflow] Repo ${repoRef.name} is already local`);
            continue;
          }

          // Prompt to clone
          console.log(
            `[ResearchWorkflow] Repo ${repoRef.name} not found locally`
          );
          const clonedPath = await cloner.cloneRepo(repoRef, this.config.pat);

          if (clonedPath) {
            availableRepoPaths.push(clonedPath);
            reposCloned.push(repoRef.name);
          }
        }
      }

      console.log(
        `[ResearchWorkflow] Available repos: ${availableRepoPaths.length}, cloned: ${reposCloned.length}`
      );

      // Create investigation context
      const context: InvestigationContext = {
        ticketId: this.config.ticketId,
        project: this.config.project,
        organization: this.config.organization,
        repoPaths: availableRepoPaths,
      };

      // Create investigators
      const codeInvestigator = new CodeInvestigator(availableRepoPaths);
      const ticketInvestigator = new TicketInvestigator(adoClient);
      const wikiInvestigator = new WikiInvestigator(
        adoClient,
        this.config.organization,
        this.config.project
      );

      // Create orchestrator
      const orchestrator = new InvestigationOrchestrator(
        codeInvestigator,
        ticketInvestigator,
        wikiInvestigator
      );

      // Execute investigation
      console.log('[ResearchWorkflow] Executing investigation...');
      const investigation = await orchestrator.investigate(context);

      // Synthesize findings
      console.log('[ResearchWorkflow] Synthesizing findings...');
      const summary = synthesizeFindings(investigation, workItem);

      console.log(
        `[ResearchWorkflow] Investigation complete with ${summary.confidence} confidence`
      );

      return ok({
        investigation,
        summary,
        workItem,
        reposCloned,
      });
    } catch (error) {
      if (error instanceof Error) {
        return err(error);
      }
      return err(new Error(`Unknown error in research workflow: ${error}`));
    }
  }
}

/**
 * Execute research workflow.
 * Main entry point for CLI and programmatic use.
 *
 * @param config - Research workflow configuration
 * @returns Result with ResearchWorkflowOutput or Error
 */
export async function executeResearch(
  config: ResearchWorkflowConfig
): Promise<Result<ResearchWorkflowOutput, Error>> {
  const workflow = new ResearchWorkflow(config);
  return workflow.execute();
}
