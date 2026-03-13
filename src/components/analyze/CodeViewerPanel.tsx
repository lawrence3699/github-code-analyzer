'use client';

import { useState, useCallback, useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Loader2, FileCode2 } from 'lucide-react';
import clsx from 'clsx';
import type { FileContent } from '../../types/github';
import { useLocale } from '../../hooks/useLocale';
import { useTheme } from '../../hooks/useTheme';
import { interpolate } from '../../i18n';
import { Button } from '../ui/Button';

interface CodeViewerPanelProps {
  readonly fileContent: FileContent | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly selectedPath: string | null;
}

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.vue': 'markup',
  '.svelte': 'markup',
  '.html': 'markup',
  '.htm': 'markup',
  '.xml': 'xml',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.md': 'markdown',
  '.sql': 'sql',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.fish': 'bash',
  '.ps1': 'powershell',
  '.php': 'php',
  '.r': 'r',
  '.lua': 'lua',
  '.dart': 'dart',
  '.scala': 'scala',
  '.clj': 'clojure',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.erl': 'erlang',
  '.hs': 'haskell',
  '.ml': 'ocaml',
  '.dockerfile': 'docker',
  '.tf': 'hcl',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.proto': 'protobuf',
  '.ini': 'ini',
  '.env': 'bash',
  '.txt': 'text',
};

function getLanguageFromPath(path: string): string {
  const fileName = path.split('/').pop() ?? '';

  if (fileName === 'Dockerfile' || fileName.startsWith('Dockerfile.')) {
    return 'docker';
  }
  if (fileName === 'Makefile' || fileName === 'makefile') {
    return 'makefile';
  }
  if (fileName === '.gitignore' || fileName === '.dockerignore') {
    return 'bash';
  }

  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex <= 0) return 'text';
  const ext = fileName.slice(dotIndex).toLowerCase();
  return EXTENSION_TO_LANGUAGE[ext] ?? 'text';
}

function Breadcrumb({ path }: { readonly path: string }): React.ReactElement {
  const parts = path.split('/');

  return (
    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 overflow-x-auto">
      {parts.map((part, i) => (
        <span key={`${part}-${i}`} className="flex items-center gap-1 shrink-0">
          {i > 0 && <span className="text-gray-300 dark:text-slate-600">/</span>}
          <span
            className={clsx(
              i === parts.length - 1 ? 'text-gray-800 dark:text-slate-200' : 'text-gray-400 dark:text-slate-500',
            )}
          >
            {part}
          </span>
        </span>
      ))}
    </div>
  );
}

export function CodeViewerPanel({
  fileContent,
  loading,
  error,
  selectedPath,
}: CodeViewerPanelProps): React.ReactElement {
  const { t } = useLocale();
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  const language = useMemo(
    () => (selectedPath ? getLanguageFromPath(selectedPath) : 'text'),
    [selectedPath],
  );

  const lineCount = useMemo(
    () => fileContent?.content.split('\n').length ?? 0,
    [fileContent],
  );

  const handleCopy = useCallback(async (): Promise<void> => {
    if (!fileContent) return;
    try {
      await navigator.clipboard.writeText(fileContent.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [fileContent]);

  if (!selectedPath) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300">
            {t('analyze.codeViewer.title')}
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <FileCode2 className="h-12 w-12 text-gray-300 dark:text-slate-700 mx-auto" />
            <p className="text-sm text-gray-400 dark:text-slate-500">
              {t('analyze.codeViewer.selectFile')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700">
          <Breadcrumb path={selectedPath} />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('analyze.codeViewer.loading')}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700">
          <Breadcrumb path={selectedPath} />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-red-400">
            {t('analyze.codeViewer.error')}
          </p>
        </div>
      </div>
    );
  }

  if (!fileContent) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700">
          <Breadcrumb path={selectedPath} />
        </div>
        <div className="flex-1" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-slate-700">
        <Breadcrumb path={selectedPath} />
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-gray-400 dark:text-slate-500">
            {interpolate(t('analyze.codeViewer.lines'), { count: lineCount })}
          </span>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-3 w-3 text-green-400" />
                <span className="text-green-400">{t('common.copied')}</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                {t('common.copy')}
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        <SyntaxHighlighter
          language={language}
          style={theme === 'dark' ? oneDark : oneLight}
          showLineNumbers
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '13px',
            lineHeight: '1.5',
            background: 'transparent',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'var(--font-geist-mono), monospace',
            },
          }}
        >
          {fileContent.content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
