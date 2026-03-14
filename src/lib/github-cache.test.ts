import {
  repoInfoCache,
  repoTreeCache,
  updateRateLimit,
  getRateLimit,
  hasToken,
} from './github-cache';
import type { RepoInfo, TreeResult } from '../types/github';

const mockRepoInfo: RepoInfo = {
  name: 'test-repo',
  fullName: 'owner/test-repo',
  description: 'A test repo',
  defaultBranch: 'main',
  stars: 100,
  forks: 10,
  language: 'TypeScript',
};

const mockTreeResult: TreeResult = {
  tree: [
    { path: 'src', name: 'src', type: 'tree', children: [] },
    { path: 'README.md', name: 'README.md', type: 'blob', size: 100 },
  ],
  truncated: false,
};

describe('repoInfoCache', () => {
  beforeEach(() => {
    repoInfoCache.clear();
  });

  it('should return undefined for missing keys', () => {
    expect(repoInfoCache.get('nonexistent')).toBeUndefined();
  });

  it('should store and retrieve values', () => {
    repoInfoCache.set('owner/repo', mockRepoInfo);
    expect(repoInfoCache.get('owner/repo')).toEqual(mockRepoInfo);
  });

  it('should return undefined for expired entries', () => {
    repoInfoCache.set('owner/repo', mockRepoInfo);

    // Advance time past TTL (5 minutes)
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 6 * 60 * 1000);

    expect(repoInfoCache.get('owner/repo')).toBeUndefined();

    jest.restoreAllMocks();
  });

  it('should return value within TTL window', () => {
    repoInfoCache.set('owner/repo', mockRepoInfo);

    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 4 * 60 * 1000);

    expect(repoInfoCache.get('owner/repo')).toEqual(mockRepoInfo);

    jest.restoreAllMocks();
  });

  it('should track size correctly', () => {
    expect(repoInfoCache.size()).toBe(0);
    repoInfoCache.set('a', mockRepoInfo);
    repoInfoCache.set('b', mockRepoInfo);
    expect(repoInfoCache.size()).toBe(2);
  });

  it('should clear all entries', () => {
    repoInfoCache.set('a', mockRepoInfo);
    repoInfoCache.set('b', mockRepoInfo);
    repoInfoCache.clear();
    expect(repoInfoCache.size()).toBe(0);
    expect(repoInfoCache.get('a')).toBeUndefined();
  });

  it('should overwrite existing entries with same key', () => {
    repoInfoCache.set('owner/repo', mockRepoInfo);
    const updated: RepoInfo = { ...mockRepoInfo, stars: 200 };
    repoInfoCache.set('owner/repo', updated);
    expect(repoInfoCache.get('owner/repo')).toEqual(updated);
    expect(repoInfoCache.size()).toBe(1);
  });
});

describe('repoTreeCache', () => {
  beforeEach(() => {
    repoTreeCache.clear();
  });

  it('should store and retrieve tree results', () => {
    repoTreeCache.set('owner/repo/main', mockTreeResult);
    expect(repoTreeCache.get('owner/repo/main')).toEqual(mockTreeResult);
  });

  it('should expire after 10 minutes', () => {
    repoTreeCache.set('owner/repo/main', mockTreeResult);

    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 11 * 60 * 1000);

    expect(repoTreeCache.get('owner/repo/main')).toBeUndefined();

    jest.restoreAllMocks();
  });
});

describe('updateRateLimit / getRateLimit', () => {
  it('should parse valid rate limit headers', () => {
    updateRateLimit({
      'x-ratelimit-remaining': '4999',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-reset': '1700000000',
    });

    const info = getRateLimit();
    expect(info).toEqual({
      remaining: 4999,
      limit: 5000,
      reset: 1700000000,
    });
  });

  it('should ignore invalid headers', () => {
    // Set valid first
    updateRateLimit({
      'x-ratelimit-remaining': '100',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-reset': '1700000000',
    });

    // Try invalid — should not overwrite
    updateRateLimit({
      'x-ratelimit-remaining': 'abc',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-reset': '1700000000',
    });

    expect(getRateLimit()?.remaining).toBe(100);
  });

  it('should handle missing headers gracefully', () => {
    updateRateLimit({
      'x-ratelimit-remaining': '50',
      'x-ratelimit-limit': '60',
      'x-ratelimit-reset': '1700000000',
    });

    updateRateLimit({});
    // Previous value should remain
    expect(getRateLimit()?.remaining).toBe(50);
  });

  it('should update with latest values', () => {
    updateRateLimit({
      'x-ratelimit-remaining': '100',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-reset': '1700000000',
    });

    updateRateLimit({
      'x-ratelimit-remaining': '99',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-reset': '1700000000',
    });

    expect(getRateLimit()?.remaining).toBe(99);
  });
});

describe('hasToken', () => {
  const originalEnv = process.env.GITHUB_TOKEN;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.GITHUB_TOKEN = originalEnv;
    } else {
      delete process.env.GITHUB_TOKEN;
    }
  });

  it('should return false when no token is set', () => {
    delete process.env.GITHUB_TOKEN;
    expect(hasToken()).toBe(false);
  });

  it('should return false for empty string token', () => {
    process.env.GITHUB_TOKEN = '';
    expect(hasToken()).toBe(false);
  });

  it('should return true when token is set', () => {
    process.env.GITHUB_TOKEN = 'ghp_test123';
    expect(hasToken()).toBe(true);
  });
});
