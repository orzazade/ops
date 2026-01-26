/**
 * Context Engine for assembling LLM context from research results.
 *
 * The ContextEngine orchestrates context assembly with:
 * - Accurate token counting via Anthropic API
 * - Priority-based overflow handling
 * - Section management with budget tracking
 *
 * Usage:
 * ```typescript
 * const engine = new ContextEngine({ totalBudget: 4000 });
 * const context = await engine.fromResearchResults(results);
 * console.log(engine.getStats());
 * ```
 *
 * @module context/engine
 */

import Anthropic from '@anthropic-ai/sdk';
import { Result, ok, err } from 'neverthrow';
import { TokenBudget, OverflowError } from './token-budget.js';
import type { ContextSection, ContextStats } from './types.js';
import type { ResearchResults } from '../researchers/orchestrator.js';
import {
  buildWorkItemsSection,
  buildPullRequestsSection,
  buildProjectsSection,
} from './sections/index.js';

/**
 * Configuration for ContextEngine.
 */
/**
 * Section priority configuration.
 * Higher values = more important, kept during overflow.
 */
export interface SectionPriorities {
  workItems: number;
  pullRequests: number;
  projects: number;
}

/**
 * Configuration for ContextEngine.
 */
export interface ContextEngineConfig {
  /** Total token budget for context (default: 4000) */
  totalBudget?: number;
  /** Anthropic API key (default: from ANTHROPIC_API_KEY env var) */
  apiKey?: string;
  /** Model to use for token counting (default: claude-opus-4-5-20251101) */
  model?: string;
  /** Section priorities (higher = more important, kept during overflow) */
  priorities?: SectionPriorities;
}

const DEFAULT_PRIORITIES: SectionPriorities = {
  workItems: 10, // Highest - daily work focus
  pullRequests: 8, // High - code review urgency
  projects: 6, // Medium - project awareness
};

interface ResolvedConfig {
  totalBudget: number;
  apiKey: string;
  model: string;
  priorities: SectionPriorities;
}

const DEFAULT_CONFIG = {
  totalBudget: 4000, // NFR-1.4: Response reserve leaves 4K for context
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  model: 'claude-opus-4-5-20251101',
  priorities: DEFAULT_PRIORITIES,
};

/**
 * Context engine for assembling LLM context from research results.
 *
 * Uses Anthropic SDK for accurate token counting and TokenBudget
 * for priority-based overflow handling.
 */
export class ContextEngine {
  private readonly config: ResolvedConfig;
  private budget: TokenBudget;
  private readonly client: Anthropic;
  private sections: ContextSection[] = [];

  /**
   * Creates a new ContextEngine instance.
   *
   * @param config - Engine configuration options
   * @example
   * ```typescript
   * // Use defaults (4000 tokens, env API key)
   * const engine = new ContextEngine();
   *
   * // Custom budget
   * const engine = new ContextEngine({ totalBudget: 2000 });
   *
   * // Custom priorities
   * const engine = new ContextEngine({
   *   priorities: { workItems: 10, pullRequests: 5, projects: 3 }
   * });
   * ```
   */
  constructor(config: ContextEngineConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      priorities: { ...DEFAULT_CONFIG.priorities, ...config.priorities },
    };
    this.budget = new TokenBudget(this.config.totalBudget);
    this.client = new Anthropic({ apiKey: this.config.apiKey });
  }

  /**
   * Count tokens in text using Anthropic API.
   *
   * Uses the Anthropic messages.countTokens API for accurate counting.
   * Falls back to rough approximation (4 chars per token) if API fails.
   *
   * @param text - Text to count tokens for
   * @returns Token count
   */
  async countTokens(text: string): Promise<number> {
    if (!text || text.trim().length === 0) {
      return 0;
    }

    try {
      const count = await this.client.messages.countTokens({
        model: this.config.model,
        messages: [{ role: 'user', content: text }],
      });
      return count.input_tokens;
    } catch (error) {
      // Fallback: rough approximation (4 chars per token)
      // Only use if API fails, log warning
      console.warn(
        '[ContextEngine] Token count API failed, using approximation:',
        error
      );
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Add a section to the context.
   *
   * Counts tokens and either:
   * - Adds section if within budget
   * - Handles overflow by dropping lower priority sections
   * - Returns error if cannot fit even after overflow handling
   *
   * @param name - Section name (used as identifier)
   * @param content - Section content (already formatted XML)
   * @param priority - Priority for overflow handling (higher = keep)
   * @returns Ok if added, Err if overflow couldn't be handled
   */
  async addSection(
    name: string,
    content: string,
    priority: number
  ): Promise<Result<void, OverflowError>> {
    const tokens = await this.countTokens(content);

    if (this.budget.canAllocate(tokens)) {
      this.sections.push({ name, content, priority, tokens });
      this.budget.allocate(name, tokens, priority);
      return ok(undefined);
    }

    // Try to handle overflow
    const overflowResult = this.budget.handleOverflow(name, tokens, priority);

    if (overflowResult.isErr()) {
      return err(overflowResult.error);
    }

    // Remove dropped sections from our tracking array
    const dropped = overflowResult.value;
    this.sections = this.sections.filter((s) => !dropped.includes(s.name));

    // Add new section
    this.sections.push({ name, content, priority, tokens });
    this.budget.allocate(name, tokens, priority);

    return ok(undefined);
  }

  /**
   * Build the final context string.
   *
   * Sorts sections by priority (highest first) to put important info at start.
   * This mitigates the "lost in the middle" effect where LLMs pay more attention
   * to content at the beginning and end of context.
   *
   * @returns Assembled XML context string
   */
  build(): string {
    if (this.sections.length === 0) {
      return '<context />';
    }

    // Sort by priority descending (important sections first - "lost in the middle" mitigation)
    const sorted = [...this.sections].sort((a, b) => b.priority - a.priority);

    const sectionsXml = sorted.map((s) => s.content).join('\n\n');

    return `<context>
${sectionsXml}
</context>`;
  }

  /**
   * Get statistics about current context state.
   *
   * Useful for debugging and monitoring token usage.
   *
   * @returns Context statistics including token counts per section
   */
  getStats(): ContextStats {
    return {
      totalTokens: this.budget.used(),
      remainingTokens: this.budget.remaining(),
      sectionCount: this.sections.length,
      sections: this.sections.map((s) => ({
        name: s.name,
        tokens: s.tokens!,
        priority: s.priority,
      })),
    };
  }

  /**
   * Build context from research results.
   *
   * Convenience method that processes ResearchResults and adds all available
   * sections with configured priorities:
   * - work_items (priority: 10) - highest, daily work focus
   * - pull_requests (priority: 8) - high, code review urgency
   * - projects (priority: 6) - medium, project awareness
   *
   * Sections that don't fit are logged as warnings but don't cause failure.
   *
   * @param results - Research results from orchestrator
   * @returns Result with built context string
   */
  async fromResearchResults(
    results: ResearchResults
  ): Promise<Result<string, OverflowError>> {
    const { priorities } = this.config;

    // Add work items if available
    if (results.ado.isOk()) {
      const { workItems, pullRequests } = results.ado.value.data;

      if (workItems.length > 0) {
        const workItemsXml = buildWorkItemsSection(workItems);
        const result = await this.addSection(
          'work_items',
          workItemsXml,
          priorities.workItems
        );
        if (result.isErr()) {
          console.warn('[ContextEngine] Could not fit work_items section');
        }
      }

      if (pullRequests.length > 0) {
        const prsXml = buildPullRequestsSection(pullRequests);
        const result = await this.addSection(
          'pull_requests',
          prsXml,
          priorities.pullRequests
        );
        if (result.isErr()) {
          console.warn('[ContextEngine] Could not fit pull_requests section');
        }
      }
    }

    // Add projects if available
    if (results.gsd.isOk()) {
      const { projects } = results.gsd.value.data;

      if (projects.length > 0) {
        const projectsXml = buildProjectsSection(projects);
        const result = await this.addSection(
          'projects',
          projectsXml,
          priorities.projects
        );
        if (result.isErr()) {
          console.warn('[ContextEngine] Could not fit projects section');
        }
      }
    }

    return ok(this.build());
  }

  /**
   * Reset the engine for reuse.
   *
   * Clears all sections and resets the token budget.
   * Useful when building multiple contexts with the same engine.
   */
  reset(): void {
    this.sections = [];
    this.budget = new TokenBudget(this.config.totalBudget);
  }
}
