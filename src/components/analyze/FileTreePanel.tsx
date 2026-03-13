'use client';

import { useState, useCallback, useMemo } from 'react';
import { Search, Loader2 } from 'lucide-react';
import type { TreeNode } from '../../types/github';
import { useLocale } from '../../hooks/useLocale';
import { interpolate } from '../../i18n';
import { FileTreeNode } from './FileTreeNode';

interface FileTreePanelProps {
  readonly tree: readonly TreeNode[];
  readonly loading: boolean;
  readonly selectedPath: string | null;
  readonly onSelectFile: (path: string) => void;
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

export function FileTreePanel({
  tree,
  loading,
  selectedPath,
  onSelectFile,
}: FileTreePanelProps): React.ReactElement {
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setSearchQuery(e.target.value);
    },
    [],
  );

  const fileCount = useMemo(() => countFiles(tree), [tree]);

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
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 py-1">
        {tree.length === 0 ? (
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
        )}
      </div>
    </div>
  );
}
