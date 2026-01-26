import { simpleGit } from 'simple-git';
import { confirm, input } from '@inquirer/prompts';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Reference to a repository that may need cloning.
 */
export interface RepoReference {
  name: string;
  url?: string;
  localPath?: string;
}

/**
 * Detects repository references from work item content.
 * Searches for patterns like "in {name} repository" and ADO git URLs.
 */
export function detectRepoReferences(
  description: string,
  title: string,
  organization: string
): RepoReference[] {
  const content = `${title} ${description}`;
  const refs: RepoReference[] = [];
  const seenNames = new Set<string>();

  // Pattern 1: Explicit repo mentions (e.g., "in CPQ repository", "CPQ repo")
  const repoNamePattern = /\b([\w-]+)\s+(?:repository|repo)\b/gi;
  const nameMatches = content.matchAll(repoNamePattern);

  for (const match of nameMatches) {
    const repoName = match[1];
    if (!seenNames.has(repoName)) {
      seenNames.add(repoName);
      refs.push({
        name: repoName,
        url: `https://dev.azure.com/${organization}/_git/${repoName}`,
      });
    }
  }

  // Pattern 2: Git URLs in description
  const urlPattern = /https:\/\/dev\.azure\.com\/[^/]+\/_git\/([^/\s]+)/g;
  const urlMatches = content.matchAll(urlPattern);

  for (const match of urlMatches) {
    const repoName = match[1];
    if (!seenNames.has(repoName)) {
      seenNames.add(repoName);
      refs.push({
        name: repoName,
        url: match[0],
      });
    }
  }

  return refs;
}

/**
 * Manages repository cloning with user confirmation.
 */
export class RepoCloner {
  constructor(private baseClonePath: string = '~/Projects/appxite') {}

  /**
   * Checks if repository already exists locally.
   */
  isRepoLocal(repoName: string): boolean {
    const expandedPath = this.baseClonePath.replace(
      '~',
      process.env.HOME || ''
    );
    const localPath = join(expandedPath, repoName);
    return existsSync(join(localPath, '.git'));
  }

  /**
   * Clones repository after user confirmation.
   * Returns local path on success, null if user declined or failed.
   */
  async cloneRepo(
    repo: RepoReference,
    pat: string
  ): Promise<string | null> {
    const expandedPath = this.baseClonePath.replace(
      '~',
      process.env.HOME || ''
    );
    const localPath = join(expandedPath, repo.name);

    // Check if already cloned
    if (existsSync(join(localPath, '.git'))) {
      console.log(`✓ Repository ${repo.name} already cloned at ${localPath}`);
      return localPath;
    }

    // Ask user for confirmation
    const shouldClone = await confirm({
      message: `Repository "${repo.name}" not found locally. Clone it for investigation?`,
      default: true,
    });

    if (!shouldClone) {
      console.log(`Skipped cloning ${repo.name}`);
      return null;
    }

    // Get clone URL if not provided
    let cloneUrl = repo.url;
    if (!cloneUrl) {
      cloneUrl = await input({
        message: `Enter clone URL for ${repo.name}:`,
      });
    }

    // Build authenticated clone URL with PAT
    const authUrl = cloneUrl.replace(
      'https://',
      `https://${pat}@`
    );

    console.log(`📥 Cloning ${repo.name}...`);

    try {
      const git = simpleGit();
      await git.clone(authUrl, localPath);
      console.log(`✓ Cloned to ${localPath}`);
      return localPath;
    } catch (error) {
      console.error(`Failed to clone ${repo.name}:`, error);
      return null;
    }
  }
}
