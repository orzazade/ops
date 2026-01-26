import { describe, it, expect } from 'vitest';
import { buildProjectsSection } from './projects.js';
import type { GSDProject } from '../../researchers/types.js';

describe('buildProjectsSection', () => {
  it('produces self-closing tag for empty array', () => {
    const result = buildProjectsSection([]);
    expect(result).toBe('<projects count="0" />');
  });

  it('compresses projects with limited remaining tasks', () => {
    const projects: GSDProject[] = [
      {
        path: '/path/to/project',
        name: 'Test Project',
        milestone: '1.0',
        currentPhase: 'Phase 2',
        status: 'In Progress',
        progress: 75,
        remainingTasks: [
          'Task 1 - complete feature A',
          'Task 2 - write tests for B',
          'Task 3 - deploy to staging',
          'Task 4 - this should be dropped',
          'Task 5 - this too',
        ],
        blockers: ['Waiting for API key', 'Database migration pending'],
      },
    ];

    const result = buildProjectsSection(projects);

    // Should show count
    expect(result).toContain('count="1"');
    // Should include name, phase, status
    expect(result).toContain('name="Test Project"');
    expect(result).toContain('<phase>Phase 2</phase>');
    expect(result).toContain('<status>In Progress</status>');
    // Should limit remaining tasks to 3
    expect(result).toContain('Task 1 - complete feature A');
    expect(result).toContain('Task 2 - write tests for B');
    expect(result).toContain('Task 3 - deploy to staging');
    expect(result).not.toContain('Task 4');
    expect(result).not.toContain('Task 5');
    // Should include blockers
    expect(result).toContain('<blockers>Waiting for API key; Database migration pending</blockers>');
  });

  it('includes blockers when present', () => {
    const projects: GSDProject[] = [
      {
        path: '/project',
        name: 'Blocked Project',
        blockers: ['Infrastructure not ready', 'Pending review'],
      },
    ];

    const result = buildProjectsSection(projects);

    expect(result).toContain('<blockers>Infrastructure not ready; Pending review</blockers>');
  });

  it('escapes all content properly', () => {
    const projects: GSDProject[] = [
      {
        path: '/project',
        name: 'Project <Alpha> & "Beta"',
        currentPhase: 'Phase "1"',
        status: 'Active & Running',
        remainingTasks: ['Fix <bug> in module', 'Update "docs"'],
        blockers: ['API <token> missing'],
      },
    ];

    const result = buildProjectsSection(projects);

    // All special chars should be escaped
    expect(result).toContain('name="Project &lt;Alpha&gt; &amp; &quot;Beta&quot;"');
    expect(result).toContain('<phase>Phase &quot;1&quot;</phase>');
    expect(result).toContain('<status>Active &amp; Running</status>');
    expect(result).toContain('Fix &lt;bug&gt; in module');
    expect(result).toContain('Update &quot;docs&quot;');
    expect(result).toContain('API &lt;token&gt; missing');
  });

  it('only includes optional fields when present', () => {
    const projects: GSDProject[] = [
      {
        path: '/minimal',
        name: 'Minimal Project',
      },
    ];

    const result = buildProjectsSection(projects);

    // Should have name
    expect(result).toContain('name="Minimal Project"');
    // Should not have optional fields
    expect(result).not.toContain('<phase>');
    expect(result).not.toContain('<status>');
    expect(result).not.toContain('<remaining_tasks>');
    expect(result).not.toContain('<blockers>');
  });

  it('includes some optional fields but not others', () => {
    const projects: GSDProject[] = [
      {
        path: '/partial',
        name: 'Partial Project',
        currentPhase: 'Phase 3',
        status: 'Active',
        // No remainingTasks or blockers
      },
    ];

    const result = buildProjectsSection(projects);

    expect(result).toContain('<phase>Phase 3</phase>');
    expect(result).toContain('<status>Active</status>');
    expect(result).not.toContain('<remaining_tasks>');
    expect(result).not.toContain('<blockers>');
  });

  it('limits output with maxItems', () => {
    const projects: GSDProject[] = [
      {
        path: '/p1',
        name: 'Project 1',
      },
      {
        path: '/p2',
        name: 'Project 2',
      },
      {
        path: '/p3',
        name: 'Project 3',
      },
    ];

    const result = buildProjectsSection(projects, 2);

    // Should only include first 2 projects
    expect(result).toContain('count="2"');
    expect(result).toContain('name="Project 1"');
    expect(result).toContain('name="Project 2"');
    expect(result).not.toContain('name="Project 3"');
  });

  it('handles empty remainingTasks array', () => {
    const projects: GSDProject[] = [
      {
        path: '/project',
        name: 'Project',
        remainingTasks: [],
      },
    ];

    const result = buildProjectsSection(projects);

    // Empty array should not produce remaining_tasks element
    expect(result).not.toContain('<remaining_tasks>');
  });

  it('handles empty blockers array', () => {
    const projects: GSDProject[] = [
      {
        path: '/project',
        name: 'Project',
        blockers: [],
      },
    ];

    const result = buildProjectsSection(projects);

    // Empty array should not produce blockers element
    expect(result).not.toContain('<blockers>');
  });
});
