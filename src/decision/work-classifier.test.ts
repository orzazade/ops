import { describe, it, expect } from 'vitest';
import { classifyWorkType } from './work-classifier.js';
import type { ScoredItem } from '../triage/types.js';

describe('classifyWorkType', () => {
  it('classifies PRs as meeting type', () => {
    const scored: ScoredItem = {
      item: {
        type: 'pull_request',
        item: {
          id: 1,
          title: 'Add feature X',
          author: 'developer',
          repoName: 'myrepo',
          vote: 0,
        },
      },
      score: 50,
      appliedRules: [],
    };
    const hints = classifyWorkType(scored);
    expect(hints.type).toBe('meeting');
    expect(hints.reasoning).toContain('review');
  });

  it('classifies review keywords as meeting type', () => {
    const scored: ScoredItem = {
      item: {
        type: 'work_item',
        item: {
          id: 123,
          title: 'Review architecture proposal',
          workItemType: 'Task',
          state: 'Active',
          priority: 2,
          assignedTo: 'dev',
        },
      },
      score: 40,
      appliedRules: [],
    };
    const hints = classifyWorkType(scored);
    expect(hints.type).toBe('meeting');
    expect(hints.reasoning).toContain('collaboration');
  });

  it('classifies meeting keywords as meeting type', () => {
    const scored: ScoredItem = {
      item: {
        type: 'work_item',
        item: {
          id: 124,
          title: 'Meeting prep for sprint planning',
          workItemType: 'Task',
          state: 'Active',
          priority: 2,
        },
      },
      score: 30,
      appliedRules: [],
    };
    const hints = classifyWorkType(scored);
    expect(hints.type).toBe('meeting');
    expect(hints.reasoning).toContain('collaboration');
  });

  it('classifies discuss keywords as meeting type', () => {
    const scored: ScoredItem = {
      item: {
        type: 'work_item',
        item: {
          id: 125,
          title: 'Discuss database design options',
          workItemType: 'Task',
          state: 'Active',
          priority: 1,
        },
      },
      score: 60,
      appliedRules: [],
    };
    const hints = classifyWorkType(scored);
    expect(hints.type).toBe('meeting');
    expect(hints.reasoning).toContain('collaboration');
  });

  it('classifies update keywords as admin type', () => {
    const scored: ScoredItem = {
      item: {
        type: 'work_item',
        item: {
          id: 126,
          title: 'Update documentation',
          workItemType: 'Task',
          state: 'Active',
          priority: 3,
        },
      },
      score: 20,
      appliedRules: [],
    };
    const hints = classifyWorkType(scored);
    expect(hints.type).toBe('admin');
    expect(hints.reasoning).toContain('admin');
  });

  it('classifies document keywords as admin type', () => {
    const scored: ScoredItem = {
      item: {
        type: 'work_item',
        item: {
          id: 127,
          title: 'Document API endpoints',
          workItemType: 'Task',
          state: 'Active',
          priority: 3,
        },
      },
      score: 15,
      appliedRules: [],
    };
    const hints = classifyWorkType(scored);
    expect(hints.type).toBe('admin');
    expect(hints.reasoning).toContain('admin');
  });

  it('classifies ticket keywords as admin type', () => {
    const scored: ScoredItem = {
      item: {
        type: 'work_item',
        item: {
          id: 128,
          title: 'Create ticket for tracking',
          workItemType: 'Task',
          state: 'Active',
          priority: 2,
        },
      },
      score: 25,
      appliedRules: [],
    };
    const hints = classifyWorkType(scored);
    expect(hints.type).toBe('admin');
    expect(hints.reasoning).toContain('admin');
  });

  it('classifies complex work items as deep type', () => {
    const scored: ScoredItem = {
      item: {
        type: 'work_item',
        item: {
          id: 129,
          title: 'Implement OAuth2 authentication flow',
          workItemType: 'Task',
          state: 'Active',
          priority: 1,
        },
      },
      score: 70,
      appliedRules: [],
    };
    const hints = classifyWorkType(scored);
    expect(hints.type).toBe('deep');
    expect(hints.reasoning).toContain('focused attention');
  });

  it('classifies bug fixes as deep type by default', () => {
    const scored: ScoredItem = {
      item: {
        type: 'work_item',
        item: {
          id: 130,
          title: 'Fix race condition in payment processor',
          workItemType: 'Bug',
          state: 'Active',
          priority: 1,
        },
      },
      score: 80,
      appliedRules: [],
    };
    const hints = classifyWorkType(scored);
    expect(hints.type).toBe('deep');
    expect(hints.reasoning).toContain('focused attention');
  });

  it('includes reasoning string in all classifications', () => {
    const scored: ScoredItem = {
      item: {
        type: 'work_item',
        item: {
          id: 131,
          title: 'Some generic task',
          workItemType: 'Task',
          state: 'Active',
          priority: 2,
        },
      },
      score: 35,
      appliedRules: [],
    };
    const hints = classifyWorkType(scored);
    expect(hints.reasoning).toBeDefined();
    expect(typeof hints.reasoning).toBe('string');
    expect(hints.reasoning.length).toBeGreaterThan(0);
  });
});
