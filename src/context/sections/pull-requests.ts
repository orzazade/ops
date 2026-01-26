import { PullRequestData } from '../../researchers/types.js';
import { compressPR } from '../compression.js';
import { escapeXml } from '../utils.js';

/**
 * Build XML section for pull requests.
 * @param prs Raw PRs from ADO researcher
 * @param maxItems Optional limit on number of items
 * @returns XML string for pull_requests section
 */
export function buildPullRequestsSection(
  prs: PullRequestData[],
  maxItems?: number
): string {
  const limited = maxItems ? prs.slice(0, maxItems) : prs;
  const compressed = limited.map(compressPR);

  if (compressed.length === 0) {
    return '<pull_requests count="0" />';
  }

  const prsXml = compressed.map(pr => `  <pr id="${pr.id}" status="${pr.status}">
    <title>${escapeXml(pr.title)}</title>
    <author>${escapeXml(pr.author)}</author>
    <repo>${escapeXml(pr.repository)}</repo>
    <reviewers>${pr.reviewerSummary}</reviewers>
  </pr>`).join('\n');

  return `<pull_requests count="${compressed.length}"${prs.length > compressed.length ? ` total="${prs.length}"` : ''}>
${prsXml}
</pull_requests>`;
}
