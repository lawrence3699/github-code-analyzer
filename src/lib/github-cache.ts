import type { RepoInfo, TreeResult } from '../types/github';

interface CacheEntry<T> {
  readonly data: T;
  readonly expiresAt: number;
}

export interface RateLimitInfo {
  readonly remaining: number;
  readonly limit: number;
  readonly reset: number; // Unix timestamp in seconds
}

interface TTLCache<T> {
  readonly get: (key: string) => T | undefined;
  readonly set: (key: string, data: T) => void;
  readonly clear: () => void;
  readonly size: () => number;
}

function createTTLCache<T>(ttlMs: number): TTLCache<T> {
  const entries = new Map<string, CacheEntry<T>>();

  function pruneExpired(): void {
    const now = Date.now();
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        entries.delete(key);
      }
    }
  }

  return {
    get(key: string): T | undefined {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (Date.now() > entry.expiresAt) {
        entries.delete(key);
        return undefined;
      }
      return entry.data;
    },

    set(key: string, data: T): void {
      if (entries.size > 200) pruneExpired();
      entries.set(key, { data, expiresAt: Date.now() + ttlMs });
    },

    clear(): void {
      entries.clear();
    },

    size(): number {
      return entries.size;
    },
  };
}

const REPO_CACHE_TTL = 5 * 60 * 1000;  // 5 minutes
const TREE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export const repoInfoCache: TTLCache<RepoInfo> = createTTLCache<RepoInfo>(REPO_CACHE_TTL);
export const repoTreeCache: TTLCache<TreeResult> = createTTLCache<TreeResult>(TREE_CACHE_TTL);

// Rate limit state — updated after every GitHub API response
let currentRateLimit: RateLimitInfo | null = null;

export function updateRateLimit(headers: Readonly<Record<string, string | undefined>>): void {
  const remaining = parseInt(headers['x-ratelimit-remaining'] ?? '', 10);
  const limit = parseInt(headers['x-ratelimit-limit'] ?? '', 10);
  const reset = parseInt(headers['x-ratelimit-reset'] ?? '', 10);

  if (!isNaN(remaining) && !isNaN(limit) && !isNaN(reset)) {
    currentRateLimit = { remaining, limit, reset };
  }
}

export function getRateLimit(): Readonly<RateLimitInfo> | null {
  return currentRateLimit;
}

export function hasToken(): boolean {
  return Boolean(process.env.GITHUB_TOKEN);
}
