import { describe, it, expect } from 'vitest';
import { buildWorkItemsSection } from './work-items.js';
import type { WorkItemData } from '../../researchers/types.js';

describe('buildWorkItemsSection', () => {
  it('produces self-closing tag for empty array', () => {
    const result = buildWorkItemsSection([]);
    expect(result).toBe('<work_items count="0" />');
  });

  it('compresses and escapes items', () => {
    const items: WorkItemData[] = [
      {
        id: 123,
        title: 'Fix <bug> & validate "input"',
        state: 'Active',
        priority: 1,
        assignedTo: 'John Doe',
        createdDate: new Date('2024-01-01'),
        changedDate: new Date('2024-01-02'),
        tags: ['backend', 'bug'],
      },
    ];

    const result = buildWorkItemsSection(items);

    // Should escape XML special chars
    expect(result).toContain('&lt;bug&gt; &amp; validate &quot;input&quot;');
    // Should show priority as P1
    expect(result).toContain('priority="P1"');
    // Should include assigned and tags
    expect(result).toContain('<assigned>John Doe</assigned>');
    expect(result).toContain('<tags>backend, bug</tags>');
    // Should show count
    expect(result).toContain('count="1"');
  });

  it('limits output with maxItems', () => {
    const items: WorkItemData[] = [
      {
        id: 1,
        title: 'Task 1',
        state: 'Active',
        priority: 1,
        createdDate: new Date(),
        changedDate: new Date(),
        tags: [],
      },
      {
        id: 2,
        title: 'Task 2',
        state: 'Active',
        priority: 2,
        createdDate: new Date(),
        changedDate: new Date(),
        tags: [],
      },
      {
        id: 3,
        title: 'Task 3',
        state: 'Active',
        priority: 3,
        createdDate: new Date(),
        changedDate: new Date(),
        tags: [],
      },
    ];

    const result = buildWorkItemsSection(items, 2);

    // Should only include first 2 items
    expect(result).toContain('count="2"');
    expect(result).toContain('total="3"');
    expect(result).toContain('id="1"');
    expect(result).toContain('id="2"');
    expect(result).not.toContain('id="3"');
  });

  it('displays priority as P1, P2, P3 format', () => {
    const items: WorkItemData[] = [
      {
        id: 1,
        title: 'High priority',
        state: 'Active',
        priority: 1,
        createdDate: new Date(),
        changedDate: new Date(),
        tags: [],
      },
      {
        id: 2,
        title: 'Medium priority',
        state: 'Active',
        priority: 2,
        createdDate: new Date(),
        changedDate: new Date(),
        tags: [],
      },
    ];

    const result = buildWorkItemsSection(items);

    expect(result).toContain('priority="P1"');
    expect(result).toContain('priority="P2"');
  });

  it('only includes optional fields when present', () => {
    const itemWithoutOptionals: WorkItemData[] = [
      {
        id: 1,
        title: 'Task without optional fields',
        state: 'Active',
        priority: 1,
        createdDate: new Date(),
        changedDate: new Date(),
        tags: [],
      },
    ];

    const result = buildWorkItemsSection(itemWithoutOptionals);

    // Should not include assigned or tags elements
    expect(result).not.toContain('<assigned>');
    expect(result).not.toContain('<tags>');
    // But should still have id, title, state
    expect(result).toContain('id="1"');
    expect(result).toContain('<title>Task without optional fields</title>');
    expect(result).toContain('<state>Active</state>');
  });

  it('includes assigned but not tags when only assignedTo is present', () => {
    const items: WorkItemData[] = [
      {
        id: 1,
        title: 'Task',
        state: 'Active',
        priority: 1,
        assignedTo: 'Jane Smith',
        createdDate: new Date(),
        changedDate: new Date(),
        tags: [],
      },
    ];

    const result = buildWorkItemsSection(items);

    expect(result).toContain('<assigned>Jane Smith</assigned>');
    expect(result).not.toContain('<tags>');
  });

  it('truncates long titles to 100 characters', () => {
    const longTitle = 'This is a very long task title that exceeds the maximum length allowed for compression and should be truncated at word boundary to preserve readability';
    const items: WorkItemData[] = [
      {
        id: 1,
        title: longTitle,
        state: 'Active',
        priority: 1,
        createdDate: new Date(),
        changedDate: new Date(),
        tags: [],
      },
    ];

    const result = buildWorkItemsSection(items);

    // Should be truncated with ...
    expect(result).toContain('...');
    // Should not contain full title
    expect(result).not.toContain(longTitle);
  });
});
