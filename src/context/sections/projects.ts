import { GSDProject } from '../../researchers/types.js';
import { compressProject } from '../compression.js';
import { escapeXml } from '../utils.js';

/**
 * Build XML section for GSD projects.
 * @param projects Raw projects from GSD researcher
 * @param maxItems Optional limit on number of projects
 * @returns XML string for projects section
 */
export function buildProjectsSection(
  projects: GSDProject[],
  maxItems?: number
): string {
  const limited = maxItems ? projects.slice(0, maxItems) : projects;
  const compressed = limited.map(compressProject);

  if (compressed.length === 0) {
    return '<projects count="0" />';
  }

  const projectsXml = compressed.map(proj => {
    const phaseLine = proj.currentPhase
      ? `\n    <phase>${escapeXml(proj.currentPhase)}</phase>`
      : '';
    const statusLine = proj.status
      ? `\n    <status>${escapeXml(proj.status)}</status>`
      : '';
    const tasksLine = proj.remainingTasks?.length
      ? `\n    <remaining_tasks>${proj.remainingTasks.map(t => escapeXml(t)).join('; ')}</remaining_tasks>`
      : '';
    const blockersLine = proj.blockers?.length
      ? `\n    <blockers>${proj.blockers.map(b => escapeXml(b)).join('; ')}</blockers>`
      : '';

    return `  <project name="${escapeXml(proj.name)}">${phaseLine}${statusLine}${tasksLine}${blockersLine}
  </project>`;
  }).join('\n');

  return `<projects count="${compressed.length}">
${projectsXml}
</projects>`;
}
