'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import type { RepoInfo, TreeNode, FileContent } from '../types/github';
import { validateGitHubUrl } from '../lib/validators';

interface UseGitHubRepoReturn {
  readonly repoInfo: RepoInfo | null;
  readonly tree: readonly TreeNode[];
  readonly truncated: boolean;
  readonly selectedFile: string | null;
  readonly fileContent: FileContent | null;
  readonly loading: boolean;
  readonly treeLoading: boolean;
  readonly fileLoading: boolean;
  readonly error: string | null;
  readonly validateAndFetch: (url: string) => Promise<{
    readonly repoInfo: RepoInfo;
    readonly tree: readonly TreeNode[];
  } | null>;
  readonly selectFile: (path: string) => Promise<void>;
}

export function useGitHubRepo(): UseGitHubRepoReturn {
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [tree, setTree] = useState<readonly TreeNode[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In-memory file content cache
  const fileCacheRef = useRef(new Map<string, FileContent>());

  const validateAndFetch = useCallback(
    async (url: string): Promise<{
      readonly repoInfo: RepoInfo;
      readonly tree: readonly TreeNode[];
    } | null> => {
      const validation = validateGitHubUrl(url);
      if (!validation.valid || !validation.owner || !validation.repo) {
        setError(validation.error ?? 'landing.invalidUrl');
        return null;
      }

      setLoading(true);
      setError(null);
      fileCacheRef.current.clear();

      try {
        const repoRes = await fetch(
          `/api/github/repo?url=${encodeURIComponent(url)}`,
        );
        const repoBody = await repoRes.json().catch(() => ({}));
        if (!repoRes.ok || !repoBody.success) {
          throw new Error(repoBody.error ?? `Failed to fetch repo: ${repoRes.status}`);
        }
        const fetchedRepo: RepoInfo = repoBody.data;
        setRepoInfo(fetchedRepo);

        setTreeLoading(true);
        // Pass defaultBranch to avoid redundant getRepoInfo call on server
        const treeRes = await fetch(
          `/api/github/tree?owner=${encodeURIComponent(validation.owner)}&repo=${encodeURIComponent(validation.repo)}&branch=${encodeURIComponent(fetchedRepo.defaultBranch)}`,
        );
        const treeBody = await treeRes.json().catch(() => ({}));
        if (!treeRes.ok || !treeBody.success) {
          throw new Error(treeBody.error ?? `Failed to fetch tree: ${treeRes.status}`);
        }
        const fetchedTree: readonly TreeNode[] = treeBody.data ?? [];
        setTree(fetchedTree);
        setTruncated(treeBody.truncated === true);
        setTreeLoading(false);
        setLoading(false);

        return { repoInfo: fetchedRepo, tree: fetchedTree };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setLoading(false);
        setTreeLoading(false);
        // Re-throw so callers can access the actual error message
        throw err;
      }
    },
    [],
  );

  const selectFile = useCallback(
    async (path: string): Promise<void> => {
      if (!repoInfo) return;

      setSelectedFile(path);

      // Check cache first
      const cached = fileCacheRef.current.get(path);
      if (cached) {
        setFileContent(cached);
        return;
      }

      setFileLoading(true);
      setFileContent(null);

      const parts = repoInfo.fullName.split('/');
      const owner = parts[0];
      const repo = parts[1];

      try {
        const res = await fetch(
          `/api/github/file?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}`,
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.success) {
          throw new Error(body.error ?? `Failed to fetch file: ${res.status}`);
        }
        const content: FileContent = body.data;
        fileCacheRef.current.set(path, content);
        setFileContent(content);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setFileLoading(false);
      }
    },
    [repoInfo],
  );

  return useMemo(
    () => ({
      repoInfo,
      tree,
      truncated,
      selectedFile,
      fileContent,
      loading,
      treeLoading,
      fileLoading,
      error,
      validateAndFetch,
      selectFile,
    }),
    [repoInfo, tree, truncated, selectedFile, fileContent, loading, treeLoading, fileLoading, error, validateAndFetch, selectFile],
  );
}
