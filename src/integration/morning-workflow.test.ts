/**
 * Simplified tests for morning workflow tier determination.
 * Full integration tests would require complex mocking - testing tier logic separately.
 */

import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { determineBriefingTier } from './morning-workflow.js';
import type { ResearchResults } from '../researchers/orchestrator.js';
import type { ADOData, GSDData } from '../researchers/types.js';

function createMockADOResult() {
  return ok({
    source: 'azure-devops' as const,
    status: 'success' as const,
    data: { workItems: [], pullRequests: [] } as ADOData,
    metadata: { timestamp: new Date(), duration_ms: 100, itemsFound: 0 },
  });
}

function createMockGSDResult() {
  return ok({
    source: 'gsd-scanner' as const,
    status: 'success' as const,
    data: { projects: [] } as GSDData,
    metadata: { timestamp: new Date(), duration_ms: 50, itemsFound: 0 },
  });
}

describe('determineBriefingTier', () => {
  it('returns tier 1 for ADO + GSD + Yesterday', () => {
    const results: ResearchResults = {
      ado: createMockADOResult(),
      gsd: createMockGSDResult(),
    };
    expect(determineBriefingTier(results, true)).toBe(1);
  });

  it('returns tier 2 for ADO + GSD without yesterday', () => {
    const results: ResearchResults = {
      ado: createMockADOResult(),
      gsd: createMockGSDResult(),
    };
    expect(determineBriefingTier(results, false)).toBe(2);
  });

  it('returns tier 3 for ADO only', () => {
    const results: ResearchResults = {
      ado: createMockADOResult(),
      gsd: err(new Error('GSD failed')),
    };
    expect(determineBriefingTier(results, false)).toBe(3);
  });

  it('returns tier 3 for GSD only', () => {
    const results: ResearchResults = {
      ado: err(new Error('ADO failed')),
      gsd: createMockGSDResult(),
    };
    expect(determineBriefingTier(results, false)).toBe(3);
  });

  it('returns tier 4 for yesterday only', () => {
    const results: ResearchResults = {
      ado: err(new Error('ADO failed')),
      gsd: err(new Error('GSD failed')),
    };
    expect(determineBriefingTier(results, true)).toBe(4);
  });

  it('returns tier 5 for no data at all', () => {
    const results: ResearchResults = {
      ado: err(new Error('ADO failed')),
      gsd: err(new Error('GSD failed')),
    };
    expect(determineBriefingTier(results, false)).toBe(5);
  });
});
