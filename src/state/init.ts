import * as fs from 'fs/promises';
import { execSync } from 'child_process';
import {
  GLOBAL_STATE_DIR,
  GLOBAL_HISTORY_DIR,
  GLOBAL_CACHE_DIR,
  getProjectStatePath,
} from './paths.js';

export async function initializeStateDirs(options?: {
  skipProject?: boolean;
  cwd?: string;
}): Promise<{ global: boolean; project: boolean }> {
  const result = { global: false, project: false };
  const cwd = options?.cwd ?? process.cwd();

  // Always create global state dirs
  await fs.mkdir(GLOBAL_HISTORY_DIR, { recursive: true });
  await fs.mkdir(GLOBAL_CACHE_DIR, { recursive: true });
  result.global = true;

  // Create project state if in git repo and not skipped
  if (!options?.skipProject && isGitRepo(cwd)) {
    const projectDir = getProjectStatePath(cwd);
    await fs.mkdir(projectDir, { recursive: true });
    result.project = true;
  }

  return result;
}

function isGitRepo(cwd: string): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

export { isGitRepo };
