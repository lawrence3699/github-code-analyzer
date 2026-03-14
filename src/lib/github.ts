import { Octokit } from '@octokit/rest';

import type { RepoInfo, TreeNode, TreeResult, FileContent } from '../types/github';
import {
  repoInfoCache,
  repoTreeCache,
  updateRateLimit,
  getRateLimit,
  hasToken,
} from './github-cache';

const MAX_FILE_SIZE = 1_000_000; // 1MB limit

function createOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  return new Octokit(token ? { auth: token } : {});
}

export class GitHubApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'GitHubApiError';
    this.statusCode = statusCode;
  }
}

function formatRateLimitHint(): string {
  const rateLimit = getRateLimit();
  if (hasToken()) {
    const resetTime = rateLimit
      ? new Date(rateLimit.reset * 1000).toLocaleTimeString()
      : 'unknown';
    return `Rate limit resets at ${resetTime}.`;
  }
  return 'Please set GITHUB_TOKEN for higher limits (60 → 5,000 req/hr).';
}

function handleApiError(error: unknown): never {
  if (
    error instanceof Error &&
    'status' in error &&
    typeof (error as Record<string, unknown>).status === 'number'
  ) {
    const status = (error as Record<string, unknown>).status as number;

    if (status === 404) {
      throw new GitHubApiError('Repository not found', 404);
    }
    if (status === 403) {
      throw new GitHubApiError(
        `GitHub API rate limit exceeded. ${formatRateLimitHint()}`,
        403,
      );
    }
    throw new GitHubApiError(
      `GitHub API error: ${error.message}`,
      status,
    );
  }

  throw new GitHubApiError(
    error instanceof Error ? error.message : 'Unknown GitHub API error',
    500,
  );
}

function extractRateLimit(headers: Record<string, string | undefined>): void {
  updateRateLimit(headers);
}

export { getRateLimit, hasToken } from './github-cache';

export async function getRepoInfo(owner: string, repo: string): Promise<RepoInfo> {
  const cacheKey = `${owner}/${repo}`;
  const cached = repoInfoCache.get(cacheKey);
  if (cached) return cached;

  const octokit = createOctokit();

  try {
    const response = await octokit.rest.repos.get({ owner, repo });
    extractRateLimit(response.headers as Record<string, string | undefined>);

    const info: RepoInfo = {
      name: response.data.name,
      fullName: response.data.full_name,
      description: response.data.description ?? null,
      defaultBranch: response.data.default_branch,
      stars: response.data.stargazers_count,
      forks: response.data.forks_count,
      language: response.data.language ?? null,
    };

    repoInfoCache.set(cacheKey, info);
    return info;
  } catch (error: unknown) {
    handleApiError(error);
  }
}

interface GitTreeItem {
  readonly path?: string;
  readonly type?: string;
  readonly size?: number;
}

function sortNodes(nodes: readonly TreeNode[]): readonly TreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type === 'tree' && b.type !== 'tree') return -1;
    if (a.type !== 'tree' && b.type === 'tree') return 1;
    return a.name.localeCompare(b.name);
  });
}

function buildTree(items: readonly GitTreeItem[]): readonly TreeNode[] {
  const root: TreeNode[] = [];
  const dirMap = new Map<string, TreeNode[]>();

  for (const item of items) {
    if (!item.path || !item.type) continue;
    if (item.type !== 'blob' && item.type !== 'tree') continue;

    const parts = item.path.split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');

    const node: TreeNode = {
      path: item.path,
      name,
      type: item.type as 'blob' | 'tree',
      ...(item.type === 'blob' && item.size !== undefined ? { size: item.size } : {}),
      ...(item.type === 'tree' ? { children: [] } : {}),
    };

    if (item.type === 'tree') {
      dirMap.set(item.path, []);
    }

    if (parentPath === '') {
      root.push(node);
    } else {
      const siblings = dirMap.get(parentPath);
      if (siblings) {
        siblings.push(node);
      }
    }
  }

  function attachChildren(nodes: TreeNode[]): readonly TreeNode[] {
    return sortNodes(
      nodes.map(node => {
        if (node.type === 'tree') {
          const childNodes = dirMap.get(node.path) ?? [];
          return {
            ...node,
            children: attachChildren(childNodes),
          };
        }
        return node;
      }),
    );
  }

  return attachChildren(root);
}

export async function getRepoTree(
  owner: string,
  repo: string,
  defaultBranch?: string,
): Promise<TreeResult> {
  const branch = defaultBranch ?? (await getRepoInfo(owner, repo)).defaultBranch;
  const cacheKey = `${owner}/${repo}/${branch}`;
  const cached = repoTreeCache.get(cacheKey);
  if (cached) return cached;

  const octokit = createOctokit();

  try {
    const response = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: branch,
      recursive: 'true',
    });
    extractRateLimit(response.headers as Record<string, string | undefined>);

    const result: TreeResult = {
      tree: buildTree(response.data.tree),
      truncated: response.data.truncated === true,
    };

    repoTreeCache.set(cacheKey, result);
    return result;
  } catch (error: unknown) {
    if (error instanceof GitHubApiError) throw error;
    handleApiError(error);
  }
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
): Promise<FileContent> {
  const octokit = createOctokit();

  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });
    extractRateLimit(response.headers as Record<string, string | undefined>);

    const { data } = response;

    if (Array.isArray(data) || data.type !== 'file') {
      throw new GitHubApiError('Path is not a file', 400);
    }

    if (data.size > MAX_FILE_SIZE) {
      throw new GitHubApiError(
        `File exceeds maximum size of ${MAX_FILE_SIZE} bytes`,
        413,
      );
    }

    const rawBytes = data.content
      ? Buffer.from(data.content, 'base64')
      : Buffer.alloc(0);

    // Detect binary: check for null bytes in first 8KB
    const sample = rawBytes.subarray(0, 8192);
    const isBinary = sample.includes(0);

    const content = isBinary
      ? '[Binary file — cannot display]'
      : rawBytes.toString('utf-8');

    const name = path.split('/').pop() ?? path;

    return {
      path,
      name,
      content,
      size: data.size,
      encoding: 'utf-8',
      binary: isBinary,
    };
  } catch (error: unknown) {
    if (error instanceof GitHubApiError) throw error;
    handleApiError(error);
  }
}
