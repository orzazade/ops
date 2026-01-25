import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GSDResearcher } from './gsd-researcher.js';
import fg from 'fast-glob';
import { readFile } from 'fs/promises';

// Mock fast-glob
vi.mock('fast-glob');

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

describe('GSDResearcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should create instance with default basePath', () => {
      const researcher = new GSDResearcher();
      expect(researcher.name).toBe('gsd-scanner');
    });

    it('should create instance with custom basePath', () => {
      const researcher = new GSDResearcher('/custom/path');
      expect(researcher.name).toBe('gsd-scanner');
    });

    it('should accept custom scanDepth', () => {
      const researcher = new GSDResearcher('/custom/path', 10);
      expect(researcher.name).toBe('gsd-scanner');
    });
  });

  describe('execute() - directory scanning', () => {
    it('should find PROJECT.md in current directory', async () => {
      const mockProjectContent = '# Test Project\n\nSome content';

      vi.mocked(fg).mockResolvedValue([
        '/test/project/.planning/PROJECT.md'
      ]);

      vi.mocked(readFile).mockResolvedValue(mockProjectContent);

      const researcher = new GSDResearcher('/test/project');
      const result = await researcher.execute();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe('success');
        expect(result.value.data.projects).toHaveLength(1);
        expect(result.value.data.projects[0].name).toBe('Test Project');
        expect(result.value.data.projects[0].path).toBe('/test/project');
      }
    });

    it('should find multiple projects in subdirectories', async () => {
      const mockProject1 = '# Project One\n';
      const mockProject2 = '# Project Two\n';

      vi.mocked(fg).mockResolvedValue([
        '/test/projects/proj1/.planning/PROJECT.md',
        '/test/projects/proj2/.planning/PROJECT.md'
      ]);

      vi.mocked(readFile)
        .mockResolvedValueOnce(mockProject1)
        .mockResolvedValueOnce(mockProject2);

      const researcher = new GSDResearcher('/test/projects');
      const result = await researcher.execute();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data.projects).toHaveLength(2);
        expect(result.value.metadata.itemsFound).toBe(2);
      }
    });

    it('should use correct fast-glob patterns with ignore list', async () => {
      vi.mocked(fg).mockResolvedValue([]);

      const researcher = new GSDResearcher('/test', 5);
      await researcher.execute();

      expect(fg).toHaveBeenCalledWith(
        '**/.planning/PROJECT.md',
        expect.objectContaining({
          cwd: '/test',
          absolute: true,
          deep: 5,
          ignore: expect.arrayContaining([
            '**/node_modules/**',
            '**/.git/**',
            '**/dist/**',
            '**/build/**',
            '**/coverage/**',
            '**/.next/**',
            '**/.cache/**'
          ])
        })
      );
    });
  });

  describe('PROJECT.md parsing', () => {
    it('should extract name from # heading', async () => {
      const mockContent = '# My Awesome Project\n\nSome description here.';

      vi.mocked(fg).mockResolvedValue(['/test/.planning/PROJECT.md']);
      vi.mocked(readFile).mockResolvedValue(mockContent);

      const researcher = new GSDResearcher('/test');
      const result = await researcher.execute();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data.projects[0].name).toBe('My Awesome Project');
      }
    });

    it('should handle PROJECT.md without frontmatter', async () => {
      const mockContent = '# Simple Project\n\nNo frontmatter here.';

      vi.mocked(fg).mockResolvedValue(['/test/.planning/PROJECT.md']);
      vi.mocked(readFile).mockResolvedValue(mockContent);

      const researcher = new GSDResearcher('/test');
      const result = await researcher.execute();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data.projects[0].name).toBe('Simple Project');
        expect(result.value.data.projects[0].milestone).toBeUndefined();
      }
    });

    it('should parse YAML frontmatter if present', async () => {
      const mockContent = `---
milestone: "1"
status: "In Progress"
---

# Project With Frontmatter

Content here.`;

      vi.mocked(fg).mockResolvedValue(['/test/.planning/PROJECT.md']);
      vi.mocked(readFile).mockResolvedValue(mockContent);

      const researcher = new GSDResearcher('/test');
      const result = await researcher.execute();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data.projects[0].name).toBe('Project With Frontmatter');
        expect(result.value.data.projects[0].milestone).toBe('1');
      }
    });
  });

  describe('STATE.md parsing', () => {
    it('should extract phase and status from STATE.md', async () => {
      const mockProject = '# Test Project';
      const mockState = `# Project State

## Current Position
- **Phase:** 2 of 5 (Researcher Agents)
- **Plan:** 01 of 4 in phase
- **Status:** In Progress

## Blockers
- Need API credentials
- Waiting for review`;

      vi.mocked(fg).mockResolvedValue(['/test/.planning/PROJECT.md']);
      vi.mocked(readFile)
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(mockState);

      const researcher = new GSDResearcher('/test');
      const result = await researcher.execute();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const project = result.value.data.projects[0];
        expect(project.currentPhase).toBe('2 of 5');
        expect(project.status).toBe('In Progress');
        expect(project.blockers).toEqual([
          'Need API credentials',
          'Waiting for review'
        ]);
      }
    });

    it('should handle missing STATE.md gracefully', async () => {
      const mockProject = '# Test Project';

      vi.mocked(fg).mockResolvedValue(['/test/.planning/PROJECT.md']);
      vi.mocked(readFile)
        .mockResolvedValueOnce(mockProject)
        .mockRejectedValueOnce(new Error('ENOENT: no such file'));

      const researcher = new GSDResearcher('/test');
      const result = await researcher.execute();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const project = result.value.data.projects[0];
        expect(project.name).toBe('Test Project');
        expect(project.currentPhase).toBeUndefined();
        expect(project.status).toBeUndefined();
      }
    });

    it('should calculate progress from STATE.md', async () => {
      const mockProject = '# Test Project';
      const mockState = `# Project State

**Progress:** ████░░░░░░░ 4/11 plans complete (36%)`;

      vi.mocked(fg).mockResolvedValue(['/test/.planning/PROJECT.md']);
      vi.mocked(readFile)
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(mockState);

      const researcher = new GSDResearcher('/test');
      const result = await researcher.execute();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const project = result.value.data.projects[0];
        expect(project.progress).toBe(36);
      }
    });
  });

  describe('error handling', () => {
    it('should return partial status when some files fail to parse', async () => {
      const mockProject1 = '# Good Project';
      const mockProject2 = 'Invalid content without heading';

      vi.mocked(fg).mockResolvedValue([
        '/test/proj1/.planning/PROJECT.md',
        '/test/proj2/.planning/PROJECT.md'
      ]);

      vi.mocked(readFile)
        .mockResolvedValueOnce(mockProject1)
        .mockResolvedValueOnce(mockProject2);

      const researcher = new GSDResearcher('/test');
      const result = await researcher.execute();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe('partial');
        expect(result.value.data.projects).toHaveLength(1);
        expect(result.value.errors).toBeDefined();
        expect(result.value.errors!.length).toBeGreaterThan(0);
      }
    });

    it('should return error when fast-glob fails', async () => {
      vi.mocked(fg).mockRejectedValue(new Error('Glob failed'));

      const researcher = new GSDResearcher('/test');
      const result = await researcher.execute();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Glob failed');
      }
    });

    it('should return failed status when all files fail to parse', async () => {
      vi.mocked(fg).mockResolvedValue([
        '/test/proj1/.planning/PROJECT.md'
      ]);

      vi.mocked(readFile).mockRejectedValue(new Error('Read failed'));

      const researcher = new GSDResearcher('/test');
      const result = await researcher.execute();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe('failed');
        expect(result.value.data.projects).toHaveLength(0);
        expect(result.value.errors).toBeDefined();
      }
    });
  });

  describe('metadata', () => {
    it('should include timestamp and duration', async () => {
      vi.mocked(fg).mockResolvedValue([]);

      const researcher = new GSDResearcher('/test');
      const result = await researcher.execute();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.metadata.timestamp).toBeInstanceOf(Date);
        expect(result.value.metadata.duration_ms).toBeGreaterThanOrEqual(0);
        expect(result.value.source).toBe('gsd-scanner');
      }
    });

    it('should set itemsFound to number of projects', async () => {
      vi.mocked(fg).mockResolvedValue([
        '/test/proj1/.planning/PROJECT.md',
        '/test/proj2/.planning/PROJECT.md'
      ]);

      vi.mocked(readFile).mockResolvedValue('# Project\n');

      const researcher = new GSDResearcher('/test');
      const result = await researcher.execute();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.metadata.itemsFound).toBe(2);
      }
    });
  });
});
