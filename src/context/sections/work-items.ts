import { WorkItemData } from '../../researchers/types.js';
import { compressWorkItem } from '../compression.js';
import { escapeXml } from '../utils.js';

/**
 * Build XML section for work items.
 * @param items Raw work items from ADO researcher
 * @param maxItems Optional limit on number of items (default: all)
 * @returns XML string for work_items section
 */
export function buildWorkItemsSection(
  items: WorkItemData[],
  maxItems?: number
): string {
  const limited = maxItems ? items.slice(0, maxItems) : items;
  const compressed = limited.map(compressWorkItem);

  if (compressed.length === 0) {
    return '<work_items count="0" />';
  }

  const itemsXml = compressed.map(item => {
    const assignedLine = item.assignedTo
      ? `\n    <assigned>${escapeXml(item.assignedTo)}</assigned>`
      : '';
    const tagsLine = item.tags
      ? `\n    <tags>${item.tags.join(', ')}</tags>`
      : '';

    return `  <item id="${item.id}" priority="P${item.priority}">
    <title>${escapeXml(item.title)}</title>
    <state>${item.state}</state>${assignedLine}${tagsLine}
  </item>`;
  }).join('\n');

  return `<work_items count="${compressed.length}"${items.length > compressed.length ? ` total="${items.length}"` : ''}>
${itemsXml}
</work_items>`;
}
