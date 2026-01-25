import { vi, describe, it, expect, beforeEach } from 'vitest';
import { loadConfig, loadOrPromptConfig, mergeConfigs } from './loader.js';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

describe('loadConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and validates config from path', async () => {
    const yaml = 'azure:\n  organization: Appxite';
    vi.mocked(fs.readFile).mockResolvedValue(yaml);

    const config = await loadConfig('/path/to/config.yaml');
    expect(config.azure.organization).toBe('Appxite');
  });

  it('throws on invalid YAML', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('invalid: [yaml: content:');
    await expect(loadConfig('/path')).rejects.toThrow();
  });

  it('throws on config validation failure', async () => {
    const yaml = 'azure: {}'; // missing required organization
    vi.mocked(fs.readFile).mockResolvedValue(yaml);
    await expect(loadConfig('/path')).rejects.toThrow();
  });
});

describe('loadOrPromptConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws helpful error when config missing', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
    await expect(loadOrPromptConfig()).rejects.toThrow(/Run \/ops:config/);
  });

  it('loads config when file exists', async () => {
    const yaml = 'azure:\n  organization: Appxite';
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue(yaml);

    const config = await loadOrPromptConfig();
    expect(config.azure.organization).toBe('Appxite');
  });
});

describe('mergeConfigs', () => {
  it('deep merges with project overriding global', () => {
    const global = { 
      azure: { organization: 'Global' }, 
      vips: [],
      priorities: {
        sprint_commitment: 3,
        vip_involvement: 3,
        blocking_others: 2,
        age_over_3_days: 2,
        p1_priority: 2,
        p2_priority: 1,
        carried_over: 1,
      },
      gsd: { scan_paths: ['.'], exclude: ['node_modules', '.git'] },
      preferences: { briefing_length: 'concise' as const, response_style: 'professional' as const, timezone: 'UTC' }
    };
    const project = { azure: { default_project: 'MyProject' } };
    const merged = mergeConfigs(global, project);
    expect(merged.azure.organization).toBe('Global');
    expect(merged.azure.default_project).toBe('MyProject');
  });

  it('project config overrides nested values', () => {
    const global = { 
      azure: { organization: 'Global', default_project: 'OldProject' },
      vips: [],
      priorities: {
        sprint_commitment: 3,
        vip_involvement: 3,
        blocking_others: 2,
        age_over_3_days: 2,
        p1_priority: 2,
        p2_priority: 1,
        carried_over: 1,
      },
      gsd: { scan_paths: ['.'], exclude: ['node_modules', '.git'] },
      preferences: { briefing_length: 'concise' as const, response_style: 'professional' as const, timezone: 'UTC' }
    };
    const project = { 
      azure: { default_project: 'NewProject' },
      preferences: { briefing_length: 'detailed' as const }
    };
    const merged = mergeConfigs(global, project);
    expect(merged.azure.default_project).toBe('NewProject');
    expect(merged.preferences.briefing_length).toBe('detailed');
  });
});
