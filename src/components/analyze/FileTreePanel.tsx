'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Search, Loader2, FileCode } from 'lucide-react';
import type { TreeNode } from '../../types/github';
import { useLocale } from '../../hooks/useLocale';
import { interpolate } from '../../i18n';
import { FileTreeNode } from './FileTreeNode';

type SearchMode = 'file' | 'function';

interface FunctionSearchState {
  readonly query: string;
  readonly results: readonly string[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly searched: boolean;
}

const INITIAL_FUNCTION_SEARCH: FunctionSearchState = {
  query: '',
  results: [],
  loading: false,
  error: null,
  searched: false,
};

const DEBOUNCE_DELAY_MS = 500;

interface FileTreePanelProps {
  readonly tree: readonly TreeNode[];
  readonly loading: boolean;
  readonly selectedPath: string | null;
  readonly onSelectFile: (path: string) => void;
  readonly owner?: string;
  readonly repo?: string;
}

function countFiles(nodes: readonly TreeNode[]): number {
  if (!Array.isArray(nodes)) return 0;
  let count = 0;
  for (const node of nodes) {
    if (node.type === 'blob') {
      count += 1;
    }
    if (node.children) {
      count += countFiles(node.children);
    }
  }
  return count;
}

async function fetchFunctionSearch(
  owner: string,
  repo: string,
  functionName: string,
): Promise<readonly string[]> {
  const params = new URLSearchParams({
    owner,
    repo,
    functionName,
  });
  const res = await fetch(`/api/github/search-function?${params.toString()}`);
  const body = await res.json();

  if (!body.success) {
    throw new Error(body.error ?? 'Search failed');
  }

  const files = body.data?.files;
  return Array.isArray(files) ? files : [];
}

export function FileTreePanel({
  tree,
  loading,
  selectedPath,
  onSelectFile,
  owner,
  repo,
}: FileTreePanelProps): React.ReactElement {
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('file');
  const [functionSearch, setFunctionSearch] = useState<FunctionSearchState>(INITIAL_FUNCTION_SEARCH);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setSearchQuery(e.target.value);
    },
    [],
  );

  const handleFunctionQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const value = e.target.value;
      if (!value.trim()) {
        // Reset everything when query is cleared
        setFunctionSearch(INITIAL_FUNCTION_SEARCH);
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      } else {
        setFunctionSearch((prev) => ({
          ...prev,
          query: value,
          searched: false,
          error: null,
        }));
      }
    },
    [],
  );

  const executeFunctionSearch = useCallback(
    async (functionName: string): Promise<void> => {
      if (!owner || !repo || !functionName.trim()) {
        return;
      }

      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setFunctionSearch((prev) => ({
        ...prev,
        loading: true,
        error: null,
        searched: false,
      }));

      try {
        const files = await fetchFunctionSearch(owner, repo, functionName.trim());

        // If this request was aborted, don't update state
        if (controller.signal.aborted) return;

        setFunctionSearch((prev) => ({
          ...prev,
          results: files,
          loading: false,
          searched: true,
        }));
      } catch (err) {
        if (controller.signal.aborted) return;

        const message = err instanceof Error ? err.message : 'Unknown error';
        setFunctionSearch((prev) => ({
          ...prev,
          results: [],
          loading: false,
          error: message,
          searched: true,
        }));
      }
    },
    [owner, repo],
  );

  // Debounced function search
  useEffect(() => {
    if (searchMode !== 'function') return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const query = functionSearch.query.trim();
    if (!query) return;

    debounceTimerRef.current = setTimeout(() => {
      executeFunctionSearch(query);
    }, DEBOUNCE_DELAY_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [functionSearch.query, searchMode, executeFunctionSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleFunctionKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') {
        // Clear debounce and search immediately
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        executeFunctionSearch(functionSearch.query);
      }
    },
    [executeFunctionSearch, functionSearch.query],
  );

  const handleSwitchToFile = useCallback((): void => {
    setSearchMode('file');
  }, []);

  const handleSwitchToFunction = useCallback((): void => {
    setSearchMode('function');
  }, []);

  const handleResultClick = useCallback(
    (path: string): void => {
      onSelectFile(path);
    },
    [onSelectFile],
  );

  const fileCount = useMemo(() => countFiles(tree), [tree]);

  const hasFunctionSearch = Boolean(owner && repo);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300">
            {t('analyze.fileTree.title')}
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('analyze.fileTree.loading')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300">
            {t('analyze.fileTree.title')}
          </h3>
          <span className="text-xs text-gray-400 dark:text-slate-500">
            {interpolate(t('analyze.fileTree.fileCount'), { count: fileCount })}
          </span>
        </div>

        {/* Search mode tabs */}
        {hasFunctionSearch && (
          <div className="flex mb-2 rounded-md overflow-hidden border border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleSwitchToFile}
              className={`flex-1 text-xs py-1 transition-colors ${
                searchMode === 'file'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {t('analyze.fileTree.fileSearchTab')}
            </button>
            <button
              type="button"
              onClick={handleSwitchToFunction}
              className={`flex-1 text-xs py-1 transition-colors ${
                searchMode === 'function'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {t('analyze.fileTree.functionSearchTab')}
            </button>
          </div>
        )}

        {/* Search input */}
        {searchMode === 'file' ? (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={t('analyze.fileTree.searchPlaceholder')}
              className="w-full rounded-md border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 pl-8 pr-3 py-1.5 text-xs text-gray-600 dark:text-slate-300 placeholder:text-gray-400 dark:placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-blue-500/50"
            />
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              value={functionSearch.query}
              onChange={handleFunctionQueryChange}
              onKeyDown={handleFunctionKeyDown}
              placeholder={t('analyze.fileTree.searchFunction')}
              className="w-full rounded-md border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 pl-8 pr-3 py-1.5 text-xs text-gray-600 dark:text-slate-300 placeholder:text-gray-400 dark:placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-blue-500/50"
            />
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto min-h-0 py-1">
        {searchMode === 'file' ? (
          /* File tree mode */
          tree.length === 0 ? (
            <p className="px-3 py-4 text-sm text-gray-400 dark:text-slate-500 text-center">
              {t('analyze.fileTree.noFiles')}
            </p>
          ) : (
            tree.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                depth={0}
                selectedPath={selectedPath}
                searchQuery={searchQuery}
                onSelectFile={onSelectFile}
              />
            ))
          )
        ) : (
          /* Function search mode */
          <FunctionSearchResults
            state={functionSearch}
            selectedPath={selectedPath}
            onSelectFile={handleResultClick}
          />
        )}
      </div>
    </div>
  );
}

interface FunctionSearchResultsProps {
  readonly state: FunctionSearchState;
  readonly selectedPath: string | null;
  readonly onSelectFile: (path: string) => void;
}

function FunctionSearchResults({
  state,
  selectedPath,
  onSelectFile,
}: FunctionSearchResultsProps): React.ReactElement {
  const { t } = useLocale();

  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t('analyze.fileTree.searchingFunction')}
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <p className="px-3 py-4 text-xs text-red-500 dark:text-red-400 text-center">
        {state.error}
      </p>
    );
  }

  if (!state.searched || !state.query.trim()) {
    return <></>;
  }

  if (state.results.length === 0) {
    return (
      <p className="px-3 py-4 text-xs text-gray-400 dark:text-slate-500 text-center">
        {t('analyze.fileTree.noFunctionResults')}
      </p>
    );
  }

  return (
    <div>
      <p className="px-3 py-1.5 text-xs text-gray-400 dark:text-slate-500">
        {interpolate(t('analyze.fileTree.functionResults'), {
          count: state.results.length,
        })}
      </p>
      <ul>
        {state.results.map((filePath) => (
          <li key={filePath}>
            <button
              type="button"
              onClick={() => onSelectFile(filePath)}
              className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ${
                selectedPath === filePath
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-slate-300'
              }`}
            >
              <FileCode className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-slate-500" />
              <span className="truncate font-mono">{filePath}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
