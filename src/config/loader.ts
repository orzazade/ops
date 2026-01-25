import { readFile, access } from 'fs/promises';
import { parse as parseYAML } from 'yaml';
import { OpsConfigSchema, type OpsConfig } from './schema.js';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Load and validate config from a YAML file
 */
export async function loadConfig(path: string): Promise<OpsConfig> {
  try {
    const content = await readFile(path, 'utf-8');
    const parsed = parseYAML(content);
    
    // Validate with Zod schema
    const result = OpsConfigSchema.safeParse(parsed);
    
    if (!result.success) {
      throw new Error(
        `Config validation failed at ${path}:\n${result.error.message}`
      );
    }
    
    return result.data;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Config file not found: ${path}`);
    }
    throw error;
  }
}

/**
 * Load config from ~/.ops/config.yaml with helpful error if missing
 */
export async function loadOrPromptConfig(): Promise<OpsConfig> {
  const configPath = join(homedir(), '.ops', 'config.yaml');
  
  try {
    await access(configPath);
    return await loadConfig(configPath);
  } catch (error) {
    throw new Error(
      `Config not found at ${configPath}. Run /ops:config to set up your configuration.`
    );
  }
}

/**
 * Deep merge two configs, with project overriding global
 */
export function mergeConfigs(
  global: OpsConfig,
  project: Partial<OpsConfig>
): OpsConfig {
  return {
    ...global,
    ...project,
    azure: {
      ...global.azure,
      ...project.azure,
    },
    user: project.user !== undefined ? project.user : global.user,
    vips: project.vips !== undefined ? project.vips : global.vips,
    priorities: {
      ...global.priorities,
      ...project.priorities,
    },
    gsd: {
      ...global.gsd,
      ...project.gsd,
    },
    preferences: {
      ...global.preferences,
      ...project.preferences,
    },
  };
}
