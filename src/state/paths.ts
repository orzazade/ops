import * as path from 'path';
import * as os from 'os';

// Global state (always in home dir)
export const GLOBAL_STATE_DIR = path.join(os.homedir(), '.ops');
export const GLOBAL_HISTORY_DIR = path.join(GLOBAL_STATE_DIR, 'history');
export const GLOBAL_CACHE_DIR = path.join(GLOBAL_STATE_DIR, 'cache');
export const GLOBAL_CONFIG_PATH = path.join(GLOBAL_STATE_DIR, 'config.yaml');

// Project state (in cwd)
export const PROJECT_STATE_DIR = '.ops';
export const PROJECT_OVERRIDES_PATH = path.join(PROJECT_STATE_DIR, 'overrides.yaml');

// Helper to resolve project paths
export function getProjectStatePath(cwd: string = process.cwd()): string {
  return path.join(cwd, PROJECT_STATE_DIR);
}

export function getConfigPath(): string {
  return GLOBAL_CONFIG_PATH;
}
