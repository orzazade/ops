import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ok, err } from 'neverthrow';
import type { ResearchResults } from '../researchers/orchestrator.js';
import type { ResearcherOutput, ADOData, GSDData, WorkItemData, PullRequestData, GSDProject } from '../researchers/types.js';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class Anthropic {
      messages = {
        countTokens: vi.fn().mockResolvedValue({ input_tokens: 100 }),
      };
    },
  };
});

// Import after mocking
import { ContextEngine } from './engine.js';

describe('ContextEngine', () => {
  // Reset mock state between tests
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('build', () => {
    it('builds empty context when no sections', () => {
      const engine = new ContextEngine();
      expect(engine.build()).toBe('<context />');
    });

    it('wraps sections in context tag', async () => {
      const engine = new ContextEngine({ totalBudget: 1000 });
      await engine.addSection('test', '<test>content</test>', 5);

      const result = engine.build();
      expect(result).toContain('<context>');
      expect(result).toContain('</context>');
      expect(result).toContain('<test>content</test>');
    });

    it('sorts sections by priority (highest first)', async () => {
      const engine = new ContextEngine({ totalBudget: 1000 });
      await engine.addSection('low', '<low />', 3);
      await engine.addSection('high', '<high />', 10);
      await engine.addSection('med', '<med />', 5);

      const result = engine.build();
      const highPos = result.indexOf('<high />');
      const medPos = result.indexOf('<med />');
      const lowPos = result.indexOf('<low />');

      expect(highPos).toBeLessThan(medPos);
      expect(medPos).toBeLessThan(lowPos);
    });
  });

  describe('addSection', () => {
    it('adds sections within budget', async () => {
      const engine = new ContextEngine({ totalBudget: 500 });
      const result = await engine.addSection('test', '<test />', 5);

      expect(result.isOk()).toBe(true);
      expect(engine.getStats().sectionCount).toBe(1);
    });

    it('handles overflow by dropping lower priority', async () => {
      // Create engine with small budget - mock returns 100 tokens per section
      const engine = new ContextEngine({ totalBudget: 150 });

      // Add low priority section (100 tokens, fits in 150 budget)
      await engine.addSection('low', '<low />', 3);
      expect(engine.getStats().sectionCount).toBe(1);

      // Add high priority section (100 tokens, won't fit but will drop low)
      const result = await engine.addSection('high', '<high />', 10);

      expect(result.isOk()).toBe(true);
      expect(engine.getStats().sectionCount).toBe(1);
      expect(engine.build()).toContain('<high />');
      expect(engine.build()).not.toContain('<low />');
    });

    it('returns error when cannot fit even after overflow', async () => {
      // Budget of 50, each section costs 100 tokens
      const engine = new ContextEngine({ totalBudget: 50 });

      const result = await engine.addSection('test', '<test />', 5);

      expect(result.isErr()).toBe(true);
    });
  });

  describe('countTokens', () => {
    it('returns 0 for empty string', async () => {
      const engine = new ContextEngine();
      expect(await engine.countTokens('')).toBe(0);
    });

    it('returns 0 for whitespace-only string', async () => {
      const engine = new ContextEngine();
      expect(await engine.countTokens('   \n\t  ')).toBe(0);
    });
  });

  describe('getStats', () => {
    it('returns accurate counts', async () => {
      const engine = new ContextEngine({ totalBudget: 1000 });
      await engine.addSection('a', '<a />', 5);
      await engine.addSection('b', '<b />', 7);

      const stats = engine.getStats();

      expect(stats.sectionCount).toBe(2);
      expect(stats.totalTokens).toBe(200); // 100 per section (mocked)
      expect(stats.remainingTokens).toBe(800);
      expect(stats.sections).toHaveLength(2);
    });

    it('includes per-section breakdown', async () => {
      const engine = new ContextEngine({ totalBudget: 500 });
      await engine.addSection('test', '<test />', 8);

      const stats = engine.getStats();

      expect(stats.sections[0]).toEqual({
        name: 'test',
        tokens: 100,
        priority: 8,
      });
    });
  });

  describe('reset', () => {
    it('clears all state', async () => {
      const engine = new ContextEngine({ totalBudget: 500 });
      await engine.addSection('a', '<a />', 5);
      await engine.addSection('b', '<b />', 7);

      expect(engine.getStats().sectionCount).toBe(2);

      engine.reset();

      expect(engine.getStats().sectionCount).toBe(0);
      expect(engine.getStats().totalTokens).toBe(0);
      expect(engine.build()).toBe('<context />');
    });
  });

  describe('fromResearchResults', () => {
    const createMockWorkItem = (id: number): WorkItemData => ({
      id,
      title: `Work Item ${id}`,
      state: 'Active',
      priority: 2,
      assignedTo: 'User',
      createdDate: new Date(),
      changedDate: new Date(),
      tags: ['tag1'],
    });

    const createMockPR = (id: number): PullRequestData => ({
      id,
      title: `PR ${id}`,
      author: 'Author',
      status: 'active',
      createdDate: new Date(),
      repository: 'repo',
      targetBranch: 'main',
      reviewers: [{ name: 'Reviewer', vote: 'approved', required: true }],
    });

    const createMockProject = (name: string): GSDProject => ({
      path: `/projects/${name}`,
      name,
      currentPhase: 'Phase 1',
      status: 'active',
      remainingTasks: ['Task 1', 'Task 2'],
    });

    const createADOOutput = (workItems: WorkItemData[], prs: PullRequestData[]): ResearcherOutput<ADOData> => ({
      source: 'azure-devops',
      status: 'success',
      data: { workItems, pullRequests: prs },
      metadata: {
        timestamp: new Date(),
        duration_ms: 100,
        itemsFound: workItems.length + prs.length,
      },
    });

    const createGSDOutput = (projects: GSDProject[]): ResearcherOutput<GSDData> => ({
      source: 'gsd-scanner',
      status: 'success',
      data: { projects },
      metadata: {
        timestamp: new Date(),
        duration_ms: 50,
        itemsFound: projects.length,
      },
    });

    it('processes all data from research results', async () => {
      const engine = new ContextEngine({ totalBudget: 5000 });

      const results: ResearchResults = {
        ado: ok(createADOOutput(
          [createMockWorkItem(1), createMockWorkItem(2)],
          [createMockPR(101)]
        )),
        gsd: ok(createGSDOutput([createMockProject('project-a')])),
      };

      const contextResult = await engine.fromResearchResults(results);

      expect(contextResult.isOk()).toBe(true);

      const context = contextResult._unsafeUnwrap();
      expect(context).toContain('<context>');
      expect(context).toContain('</context>');

      const stats = engine.getStats();
      expect(stats.sectionCount).toBe(3); // work_items, pull_requests, projects
    });

    it('handles ADO failure gracefully', async () => {
      const engine = new ContextEngine({ totalBudget: 5000 });

      const results: ResearchResults = {
        ado: err(new Error('ADO auth failed')),
        gsd: ok(createGSDOutput([createMockProject('project-a')])),
      };

      const contextResult = await engine.fromResearchResults(results);

      expect(contextResult.isOk()).toBe(true);

      const stats = engine.getStats();
      expect(stats.sectionCount).toBe(1); // only projects
    });

    it('handles GSD failure gracefully', async () => {
      const engine = new ContextEngine({ totalBudget: 5000 });

      const results: ResearchResults = {
        ado: ok(createADOOutput([createMockWorkItem(1)], [])),
        gsd: err(new Error('GSD scan failed')),
      };

      const contextResult = await engine.fromResearchResults(results);

      expect(contextResult.isOk()).toBe(true);

      const stats = engine.getStats();
      expect(stats.sectionCount).toBe(1); // only work_items
    });

    it('handles both failures gracefully', async () => {
      const engine = new ContextEngine({ totalBudget: 5000 });

      const results: ResearchResults = {
        ado: err(new Error('ADO failed')),
        gsd: err(new Error('GSD failed')),
      };

      const contextResult = await engine.fromResearchResults(results);

      expect(contextResult.isOk()).toBe(true);
      expect(contextResult._unsafeUnwrap()).toBe('<context />');
    });

    it('skips empty arrays', async () => {
      const engine = new ContextEngine({ totalBudget: 5000 });

      const results: ResearchResults = {
        ado: ok(createADOOutput([], [])), // empty arrays
        gsd: ok(createGSDOutput([])), // empty
      };

      const contextResult = await engine.fromResearchResults(results);

      expect(contextResult.isOk()).toBe(true);
      expect(engine.getStats().sectionCount).toBe(0);
    });

    it('respects configured priorities', async () => {
      const engine = new ContextEngine({
        totalBudget: 5000,
        priorities: {
          workItems: 10,
          pullRequests: 5,
          projects: 3,
        },
      });

      const results: ResearchResults = {
        ado: ok(createADOOutput([createMockWorkItem(1)], [createMockPR(101)])),
        gsd: ok(createGSDOutput([createMockProject('project-a')])),
      };

      await engine.fromResearchResults(results);

      const stats = engine.getStats();
      const workItemsSection = stats.sections.find(s => s.name === 'work_items');
      const prsSection = stats.sections.find(s => s.name === 'pull_requests');
      const projectsSection = stats.sections.find(s => s.name === 'projects');

      expect(workItemsSection?.priority).toBe(10);
      expect(prsSection?.priority).toBe(5);
      expect(projectsSection?.priority).toBe(3);
    });
  });
});
