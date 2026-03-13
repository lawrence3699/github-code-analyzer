'use client';

import { useState, useCallback } from 'react';
import {
  Folder,
  FolderOpen,
  File,
  FileCode2,
} from 'lucide-react';
import clsx from 'clsx';
import type { TreeNode } from '../../types/github';

interface FileTreeNodeProps {
  readonly node: TreeNode;
  readonly depth: number;
  readonly selectedPath: string | null;
  readonly searchQuery: string;
  readonly onSelectFile: (path: string) => void;
}

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.rb', '.go', '.rs',
  '.java', '.kt', '.swift', '.c', '.cpp', '.h', '.cs',
  '.vue', '.svelte', '.php', '.sh', '.bash', '.zsh',
]);

function getExtension(name: string): string {
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex <= 0) return '';
  return name.slice(dotIndex);
}

function isCodeFile(name: string): boolean {
  return CODE_EXTENSIONS.has(getExtension(name));
}

function matchesSearch(node: TreeNode, query: string): boolean {
  if (query === '') return true;
  const lowerQuery = query.toLowerCase();
  if (node.name.toLowerCase().includes(lowerQuery)) return true;
  if (node.children) {
    return node.children.some((child) => matchesSearch(child, lowerQuery));
  }
  return false;
}

function hasMatchingDescendant(node: TreeNode, query: string): boolean {
  if (query === '' || !node.children) return false;
  return node.children.some(
    (child) => matchesSearch(child, query),
  );
}

export function FileTreeNode({
  node,
  depth,
  selectedPath,
  searchQuery,
  onSelectFile,
}: FileTreeNodeProps): React.ReactElement | null {
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);

  const isFolder = node.type === 'tree';
  const isSelected = node.path === selectedPath;
  const isCode = !isFolder && isCodeFile(node.name);

  // Derive expanded state: search auto-expands, otherwise use manual state or depth default
  const searchExpanded = isFolder && searchQuery !== '' && hasMatchingDescendant(node, searchQuery);
  const expanded = manualExpanded ?? (searchExpanded || depth < 1);

  const handleClick = useCallback((): void => {
    if (isFolder) {
      setManualExpanded((prev) => {
        // Toggle from current derived state
        const current = prev ?? (searchExpanded || depth < 1);
        return !current;
      });
    } else {
      onSelectFile(node.path);
    }
  }, [isFolder, node.path, onSelectFile, searchExpanded, depth]);

  if (!matchesSearch(node, searchQuery)) {
    return null;
  }

  const FolderIcon = expanded ? FolderOpen : Folder;
  const FileIcon = isCode ? FileCode2 : File;
  const Icon = isFolder ? FolderIcon : FileIcon;

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={clsx(
          'flex items-center gap-1.5 w-full px-2 py-1 text-sm',
          'hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors rounded-sm',
          isSelected && 'bg-blue-500/20 text-blue-600 dark:text-blue-300',
          !isSelected && 'text-gray-600 dark:text-slate-300',
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <Icon
          className={clsx(
            'h-4 w-4 shrink-0',
            isFolder && 'text-yellow-400',
            !isFolder && isCode && 'text-blue-400',
            !isFolder && !isCode && 'text-gray-400 dark:text-slate-500',
          )}
        />
        <span className="truncate">{node.name}</span>
      </button>
      {isFolder && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              searchQuery={searchQuery}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
