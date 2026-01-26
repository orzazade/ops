import { describe, it, expect } from 'vitest';
import { buildPullRequestsSection } from './pull-requests.js';
import type { PullRequestData } from '../../researchers/types.js';

describe('buildPullRequestsSection', () => {
  it('produces self-closing tag for empty array', () => {
    const result = buildPullRequestsSection([]);
    expect(result).toBe('<pull_requests count="0" />');
  });

  it('compresses PRs with reviewer summary', () => {
    const prs: PullRequestData[] = [
      {
        id: 456,
        title: 'Add <feature> & update "docs"',
        author: 'Jane Smith',
        status: 'active',
        createdDate: new Date('2024-01-01'),
        repository: 'org/team/my-repo',
        targetBranch: 'main',
        reviewers: [
          { name: 'Reviewer1', vote: 'approved', required: true },
          { name: 'Reviewer2', vote: 'waiting', required: true },
        ],
      },
    ];

    const result = buildPullRequestsSection(prs);

    // Should escape XML special chars
    expect(result).toContain('&lt;feature&gt; &amp; update &quot;docs&quot;');
    // Should include author
    expect(result).toContain('<author>Jane Smith</author>');
    // Should show reviewer summary
    expect(result).toContain('<reviewers>1/2 approved, 1 waiting</reviewers>');
    // Should show count
    expect(result).toContain('count="1"');
  });

  it('reduces repository path to name only', () => {
    const prs: PullRequestData[] = [
      {
        id: 1,
        title: 'PR title',
        author: 'Author',
        status: 'active',
        createdDate: new Date(),
        repository: 'org/team/my-awesome-repo',
        targetBranch: 'main',
        reviewers: [],
      },
    ];

    const result = buildPullRequestsSection(prs);

    // Should only show repo name, not full path
    expect(result).toContain('<repo>my-awesome-repo</repo>');
    expect(result).not.toContain('org/team');
  });

  it('escapes content properly', () => {
    const prs: PullRequestData[] = [
      {
        id: 1,
        title: 'Fix <script> injection & "quotes"',
        author: 'Bob & Alice',
        status: 'active',
        createdDate: new Date(),
        repository: 'repo-name',
        targetBranch: 'main',
        reviewers: [],
      },
    ];

    const result = buildPullRequestsSection(prs);

    // All special chars should be escaped
    expect(result).toContain('&lt;script&gt;');
    expect(result).toContain('&amp;');
    expect(result).toContain('&quot;');
    expect(result).toContain('<author>Bob &amp; Alice</author>');
  });

  it('limits output with maxItems', () => {
    const prs: PullRequestData[] = [
      {
        id: 1,
        title: 'PR 1',
        author: 'Author1',
        status: 'active',
        createdDate: new Date(),
        repository: 'repo',
        targetBranch: 'main',
        reviewers: [],
      },
      {
        id: 2,
        title: 'PR 2',
        author: 'Author2',
        status: 'active',
        createdDate: new Date(),
        repository: 'repo',
        targetBranch: 'main',
        reviewers: [],
      },
      {
        id: 3,
        title: 'PR 3',
        author: 'Author3',
        status: 'active',
        createdDate: new Date(),
        repository: 'repo',
        targetBranch: 'main',
        reviewers: [],
      },
    ];

    const result = buildPullRequestsSection(prs, 2);

    // Should only include first 2 PRs
    expect(result).toContain('count="2"');
    expect(result).toContain('total="3"');
    expect(result).toContain('id="1"');
    expect(result).toContain('id="2"');
    expect(result).not.toContain('id="3"');
  });

  it('shows No reviewers when reviewers array is empty', () => {
    const prs: PullRequestData[] = [
      {
        id: 1,
        title: 'PR without reviewers',
        author: 'Solo Dev',
        status: 'active',
        createdDate: new Date(),
        repository: 'repo',
        targetBranch: 'main',
        reviewers: [],
      },
    ];

    const result = buildPullRequestsSection(prs);

    expect(result).toContain('<reviewers>No reviewers</reviewers>');
  });

  it('handles various reviewer vote combinations', () => {
    const prs: PullRequestData[] = [
      {
        id: 1,
        title: 'Mixed reviews',
        author: 'Author',
        status: 'active',
        createdDate: new Date(),
        repository: 'repo',
        targetBranch: 'main',
        reviewers: [
          { name: 'R1', vote: 'approved', required: true },
          { name: 'R2', vote: 'approved-with-suggestions', required: true },
          { name: 'R3', vote: 'waiting', required: true },
          { name: 'R4', vote: 'rejected', required: false },
        ],
      },
    ];

    const result = buildPullRequestsSection(prs);

    // Should count both approved and approved-with-suggestions as approved
    // Should show waiting and rejected counts
    expect(result).toContain('<reviewers>2/4 approved, 1 waiting, 1 rejected</reviewers>');
  });

  it('truncates long titles to 80 characters', () => {
    const longTitle = 'This is a very long pull request title that exceeds the eighty character limit and should be truncated';
    const prs: PullRequestData[] = [
      {
        id: 1,
        title: longTitle,
        author: 'Author',
        status: 'active',
        createdDate: new Date(),
        repository: 'repo',
        targetBranch: 'main',
        reviewers: [],
      },
    ];

    const result = buildPullRequestsSection(prs);

    // Should be truncated with ...
    expect(result).toContain('...');
    // Should not contain full title
    expect(result).not.toContain(longTitle);
  });
});
