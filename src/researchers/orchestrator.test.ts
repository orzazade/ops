import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { ResearchOrchestrator } from './orchestrator.js';
import type { Researcher, ResearcherOutput, ADOData, GSDData } from './types.js';

// Mock researcher factory
function createMockResearcher<T>(
  name: string,
  result: ResearcherOutput<T> | Error,
  delay: number = 0
): Researcher<T> {
  return {
    name,
    async execute() {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      if (result instanceof Error) {
        return err(result);
      }
      return ok(result);
    },
  };
}

// Mock throwing researcher (simulates Promise rejection)
function createThrowingResearcher<T>(name: string, error: Error, delay: number = 0): Researcher<T> {
  return {
    name,
    async execute() {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      throw error;
    },
  };
}

// Test data factories
function createADOOutput(itemsFound: number = 5): ResearcherOutput<ADOData> {
  return {
    source: 'azure-devops',
    status: 'success',
    data: {
      workItems: [],
      pullRequests: [],
    },
    metadata: {
      timestamp: new Date(),
      duration_ms: 100,
      itemsFound,
    },
  };
}

function createGSDOutput(itemsFound: number = 3): ResearcherOutput<GSDData> {
  return {
    source: 'gsd-scanner',
    status: 'success',
    data: {
      projects: [],
    },
    metadata: {
      timestamp: new Date(),
      duration_ms: 50,
      itemsFound,
    },
  };
}

describe('ResearchOrchestrator', () => {
  it('should execute both researchers successfully in parallel', async () => {
    const adoResearcher = createMockResearcher('ado', createADOOutput(5));
    const gsdResearcher = createMockResearcher('gsd', createGSDOutput(3));

    const orchestrator = new ResearchOrchestrator(adoResearcher, gsdResearcher);
    const results = await orchestrator.execute();

    expect(results.ado.isOk()).toBe(true);
    expect(results.gsd.isOk()).toBe(true);

    if (results.ado.isOk()) {
      expect(results.ado.value.source).toBe('azure-devops');
      expect(results.ado.value.metadata.itemsFound).toBe(5);
    }

    if (results.gsd.isOk()) {
      expect(results.gsd.value.source).toBe('gsd-scanner');
      expect(results.gsd.value.metadata.itemsFound).toBe(3);
    }

    expect(orchestrator.hasAnyResults(results)).toBe(true);
    expect(orchestrator.getTotalItems(results)).toBe(8);
  });

  it('should return partial results when ADO fails but GSD succeeds', async () => {
    const adoResearcher = createMockResearcher<ADOData>('ado', new Error('ADO API error'));
    const gsdResearcher = createMockResearcher('gsd', createGSDOutput(3));

    const orchestrator = new ResearchOrchestrator(adoResearcher, gsdResearcher);
    const results = await orchestrator.execute();

    expect(results.ado.isErr()).toBe(true);
    expect(results.gsd.isOk()).toBe(true);

    if (results.ado.isErr()) {
      expect(results.ado.error.message).toBe('ADO API error');
    }

    if (results.gsd.isOk()) {
      expect(results.gsd.value.source).toBe('gsd-scanner');
    }

    expect(orchestrator.hasAnyResults(results)).toBe(true);
    expect(orchestrator.getTotalItems(results)).toBe(3);
  });

  it('should return partial results when GSD fails but ADO succeeds', async () => {
    const adoResearcher = createMockResearcher('ado', createADOOutput(5));
    const gsdResearcher = createMockResearcher<GSDData>('gsd', new Error('File system error'));

    const orchestrator = new ResearchOrchestrator(adoResearcher, gsdResearcher);
    const results = await orchestrator.execute();

    expect(results.ado.isOk()).toBe(true);
    expect(results.gsd.isErr()).toBe(true);

    if (results.gsd.isErr()) {
      expect(results.gsd.error.message).toBe('File system error');
    }

    if (results.ado.isOk()) {
      expect(results.ado.value.source).toBe('azure-devops');
    }

    expect(orchestrator.hasAnyResults(results)).toBe(true);
    expect(orchestrator.getTotalItems(results)).toBe(5);
  });

  it('should handle both researchers failing', async () => {
    const adoResearcher = createMockResearcher<ADOData>('ado', new Error('ADO error'));
    const gsdResearcher = createMockResearcher<GSDData>('gsd', new Error('GSD error'));

    const orchestrator = new ResearchOrchestrator(adoResearcher, gsdResearcher);
    const results = await orchestrator.execute();

    expect(results.ado.isErr()).toBe(true);
    expect(results.gsd.isErr()).toBe(true);

    if (results.ado.isErr()) {
      expect(results.ado.error.message).toBe('ADO error');
    }

    if (results.gsd.isErr()) {
      expect(results.gsd.error.message).toBe('GSD error');
    }

    expect(orchestrator.hasAnyResults(results)).toBe(false);
    expect(orchestrator.getTotalItems(results)).toBe(0);
  });

  it('should execute researchers in parallel, not sequentially', async () => {
    // ADO takes 100ms, GSD takes 100ms
    // If parallel: ~100ms total
    // If sequential: ~200ms total
    const adoResearcher = createMockResearcher('ado', createADOOutput(5), 100);
    const gsdResearcher = createMockResearcher('gsd', createGSDOutput(3), 100);

    const orchestrator = new ResearchOrchestrator(adoResearcher, gsdResearcher);

    const startTime = Date.now();
    await orchestrator.execute();
    const duration = Date.now() - startTime;

    // Allow some overhead, but should be closer to 100ms than 200ms
    expect(duration).toBeLessThan(150);
    expect(duration).toBeGreaterThanOrEqual(100);
  });

  it('should count total items correctly across researchers', async () => {
    const adoResearcher = createMockResearcher('ado', createADOOutput(10));
    const gsdResearcher = createMockResearcher('gsd', createGSDOutput(7));

    const orchestrator = new ResearchOrchestrator(adoResearcher, gsdResearcher);
    const results = await orchestrator.execute();

    expect(orchestrator.getTotalItems(results)).toBe(17);
  });

  it('should handle researchers that throw exceptions', async () => {
    const adoResearcher = createThrowingResearcher<ADOData>('ado', new Error('Unexpected exception'));
    const gsdResearcher = createMockResearcher('gsd', createGSDOutput(3));

    const orchestrator = new ResearchOrchestrator(adoResearcher, gsdResearcher);
    const results = await orchestrator.execute();

    expect(results.ado.isErr()).toBe(true);
    expect(results.gsd.isOk()).toBe(true);

    if (results.ado.isErr()) {
      expect(results.ado.error.message).toBe('Unexpected exception');
    }

    expect(orchestrator.hasAnyResults(results)).toBe(true);
  });
});
