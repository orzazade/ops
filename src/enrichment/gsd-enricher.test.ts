import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { GSDEnricher } from './gsd-enricher.js';
import { EnrichedGSDItem } from './types.js';

describe('GSDEnricher', () => {
  const testDir = join(process.cwd(), 'test-fixtures', 'gsd-enricher');
  let enricher: GSDEnricher;

  beforeEach(async () => {
    enricher = new GSDEnricher();
    // Clean up and create test directory
    await rm(testDir, { recursive: true, force: true });
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test fixtures
    await rm(testDir, { recursive: true, force: true });
  });

  describe('enrich()', () => {
    it('should return complete EnrichedGSDItem with all planning files', async () => {
      // Arrange: Create .planning/ directory with all files
      const projectPath = join(testDir, 'complete-project');
      const planningDir = join(projectPath, '.planning');
      await mkdir(planningDir, { recursive: true });

      const planContent = `---
phase: 01-setup
plan: 01
---

## Goal

Implement authentication system with JWT tokens and refresh token rotation.

## Tasks

1. Create auth service
2. Add JWT signing
`;

      const summaryContent = `# Phase 1 Plan 1: Authentication Summary

Implemented JWT-based authentication with refresh token rotation.
All security requirements met.
`;

      const stateContent = `# Project State

## Current Position

Phase: 1 of 5 (Setup)
Plan: 1 of 3
Status: In progress
Last activity: 2026-01-27

Progress: [███░░░░░░░] 33%
`;

      await writeFile(join(planningDir, 'PLAN.md'), planContent, 'utf-8');
      await writeFile(join(planningDir, 'SUMMARY.md'), summaryContent, 'utf-8');
      await writeFile(join(planningDir, 'STATE.md'), stateContent, 'utf-8');

      // Act
      const result = await enricher.enrich(projectPath);

      // Assert
      expect(result.path).toBe(projectPath);
      expect(result.name).toBe('complete-project');
      expect(result.goalDescription).toBe(
        'Implement authentication system with JWT tokens and refresh token rotation.'
      );
      expect(result.summary).toContain('JWT-based authentication');
      expect(result.currentPhase).toBe('1 of 5');
      expect(result.status).toBe('In progress');
    });

    it('should return goalDescription: null when PLAN.md is missing', async () => {
      // Arrange: Create .planning/ directory without PLAN.md
      const projectPath = join(testDir, 'no-plan-project');
      const planningDir = join(projectPath, '.planning');
      await mkdir(planningDir, { recursive: true });

      const stateContent = `# Project State

## Current Position

Phase: 2 of 5 (Development)
Plan: 1 of 3
Status: In progress
`;

      await writeFile(join(planningDir, 'STATE.md'), stateContent, 'utf-8');

      // Act
      const result = await enricher.enrich(projectPath);

      // Assert
      expect(result.goalDescription).toBeNull();
      expect(result.currentPhase).toBe('2 of 5');
      expect(result.status).toBe('In progress');
    });

    it('should return summary: null when SUMMARY.md is missing', async () => {
      // Arrange: Create .planning/ directory without SUMMARY.md
      const projectPath = join(testDir, 'no-summary-project');
      const planningDir = join(projectPath, '.planning');
      await mkdir(planningDir, { recursive: true });

      const planContent = `## Goal

Build the API gateway layer.
`;

      await writeFile(join(planningDir, 'PLAN.md'), planContent, 'utf-8');

      // Act
      const result = await enricher.enrich(projectPath);

      // Assert
      expect(result.goalDescription).toBe('Build the API gateway layer.');
      expect(result.summary).toBeNull();
    });

    it('should return currentPhase: null and status: null when STATE.md is missing', async () => {
      // Arrange: Create .planning/ directory without STATE.md
      const projectPath = join(testDir, 'no-state-project');
      const planningDir = join(projectPath, '.planning');
      await mkdir(planningDir, { recursive: true });

      const planContent = `## Goal

Setup monitoring and logging infrastructure.
`;

      await writeFile(join(planningDir, 'PLAN.md'), planContent, 'utf-8');

      // Act
      const result = await enricher.enrich(projectPath);

      // Assert
      expect(result.currentPhase).toBeNull();
      expect(result.status).toBeNull();
      expect(result.goalDescription).toBe('Setup monitoring and logging infrastructure.');
    });

    it('should throw error when project directory does not exist', async () => {
      // Arrange
      const invalidPath = join(testDir, 'nonexistent-project');

      // Act & Assert
      await expect(enricher.enrich(invalidPath)).rejects.toThrow();
    });

    it('should extract goal from <objective> XML-style section', async () => {
      // Arrange: Create PLAN.md with <objective> instead of ## Goal
      const projectPath = join(testDir, 'objective-project');
      const planningDir = join(projectPath, '.planning');
      await mkdir(planningDir, { recursive: true });

      const planContent = `---
phase: 03-api
plan: 02
---

<objective>
Create RESTful API endpoints for user management with CRUD operations.
</objective>

## Tasks
1. Define routes
`;

      await writeFile(join(planningDir, 'PLAN.md'), planContent, 'utf-8');

      // Act
      const result = await enricher.enrich(projectPath);

      // Assert
      expect(result.goalDescription).toBe(
        'Create RESTful API endpoints for user management with CRUD operations.'
      );
    });

    it('should handle multiline goal descriptions', async () => {
      // Arrange
      const projectPath = join(testDir, 'multiline-goal-project');
      const planningDir = join(projectPath, '.planning');
      await mkdir(planningDir, { recursive: true });

      const planContent = `## Goal

Build a comprehensive reporting system that:
- Generates daily activity summaries
- Tracks team velocity metrics
- Provides customizable dashboards

## Context
More details here...
`;

      await writeFile(join(planningDir, 'PLAN.md'), planContent, 'utf-8');

      // Act
      const result = await enricher.enrich(projectPath);

      // Assert
      expect(result.goalDescription).toContain('Build a comprehensive reporting system');
      expect(result.goalDescription).toContain('daily activity summaries');
      expect(result.goalDescription).toContain('customizable dashboards');
      expect(result.goalDescription).not.toContain('## Context');
    });

    it('should truncate summary if over 500 characters while preserving meaning', async () => {
      // Arrange
      const projectPath = join(testDir, 'long-summary-project');
      const planningDir = join(projectPath, '.planning');
      await mkdir(planningDir, { recursive: true });

      const longSummary = `# Phase 5 Plan 3: Complete Integration Summary

This is a very detailed summary that goes on for quite some time describing all the intricate details of what was accomplished in this phase. We implemented a comprehensive authentication system with multiple layers of security including JWT tokens, refresh token rotation, rate limiting, and intrusion detection. The system also includes detailed audit logging, real-time monitoring dashboards, and automated alerting for suspicious activities. Additionally, we added support for OAuth2 providers, SAML integration, and multi-factor authentication options. The entire system is fully tested with unit tests, integration tests, and end-to-end tests covering all edge cases and security scenarios. Performance benchmarks show the system can handle over 10,000 requests per second with sub-millisecond latency. All documentation has been updated including API references, deployment guides, and security best practices.`;

      await writeFile(join(planningDir, 'SUMMARY.md'), longSummary, 'utf-8');

      // Act
      const result = await enricher.enrich(projectPath);

      // Assert
      expect(result.summary).toBeTruthy();
      expect(result.summary!.length).toBeLessThanOrEqual(500);
      expect(result.summary).toContain('authentication system');
    });
  });
});
