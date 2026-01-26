/**
 * Recommendation output formatting.
 *
 * Formats decision results as XML for Claude Code skill to present.
 * Follows project pattern: CLI outputs XML data, skill applies visual formatting.
 */

import type { Recommendation, NoWorkResult, LowConfidenceResult, DecisionResult } from '../decision/types.js';
import { escapeXml } from '../context/utils.js';

/**
 * Format recommendation as XML.
 */
export function formatRecommendation(rec: Recommendation): string {
  const item = rec.item.item.item;
  const type = rec.item.item.type;

  const alternativesXml = rec.alternatives && rec.alternatives.length > 0
    ? `
  <alternatives>
${rec.alternatives.map((alt, i) => `    <alternative rank="${i + 1}">
      <title>${escapeXml(alt.item.item.item.title)}</title>
      <summary>${escapeXml(alt.oneLiner)}</summary>
    </alternative>`).join('\n')}
  </alternatives>`
    : '';

  return `<recommendation>
  <item>
    <id>${item.id}</id>
    <type>${type}</type>
    <title>${escapeXml(item.title)}</title>
  </item>
  <reasoning>${escapeXml(rec.reasoning)}</reasoning>
  <effort>
    <level>${rec.effort.level}</level>
    <duration>${escapeXml(rec.effort.duration)}</duration>
    <reasoning>${escapeXml(rec.effort.reasoning)}</reasoning>
  </effort>
  <first_action>${escapeXml(rec.suggestedAction)}</first_action>
  <context_links>
${rec.contextLinks.map(link => `    <link>${escapeXml(link)}</link>`).join('\n')}
  </context_links>${alternativesXml}
</recommendation>`;
}

/**
 * Format no-work result as XML.
 */
export function formatNoWork(result: NoWorkResult): string {
  return `<decision_result type="no-work">
  <message>${escapeXml(result.message)}</message>
</decision_result>`;
}

/**
 * Format low-confidence result as XML.
 */
export function formatLowConfidence(result: LowConfidenceResult): string {
  const candidatesXml = `    <candidate rank="1">
      <title>${escapeXml(result.topCandidate.scored.item.item.title)}</title>
      <score>${result.topCandidate.finalScore.toFixed(1)}</score>
      <work_type>${result.topCandidate.workType.type}</work_type>
    </candidate>`;

  return `<decision_result type="low-confidence">
  <reasoning>${escapeXml(result.reasoning)}</reasoning>
  <candidates>
${candidatesXml}
  </candidates>
</decision_result>`;
}

/**
 * Format any decision result based on type.
 */
export function formatDecisionResult(result: DecisionResult): string {
  if (result.type === 'no-work') {
    return formatNoWork(result as NoWorkResult);
  }
  if (result.type === 'low-confidence') {
    return formatLowConfidence(result as LowConfidenceResult);
  }
  // Type is 'recommendation'
  const rec = result as { type: 'recommendation'; recommendation: Recommendation };
  return formatRecommendation(rec.recommendation);
}
