'use client';

import { Suspense, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useLocale } from '../../hooks/useLocale';
import { useLogger } from '../../hooks/useLogger';
import { useGitHubRepo } from '../../hooks/useGitHubRepo';
import { useAIAnalysis } from '../../hooks/useAIAnalysis';
import { filterCodeFiles } from '../../lib/file-filter';
import { interpolate } from '../../i18n';
import { Logo } from '../../components/landing/Logo';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';
import { PanelToggle } from '../../components/analyze/PanelToggle';
import { SplitHandle } from '../../components/analyze/SplitHandle';
import { LeftPanel } from '../../components/analyze/LeftPanel';
import { FileTreePanel } from '../../components/analyze/FileTreePanel';
import { CodeViewerPanel } from '../../components/analyze/CodeViewerPanel';
import { usePanelLayout } from '../../hooks/usePanelLayout';
import type { AIProviderName } from '../../types/ai';
import type { TreeNode } from '../../types/github';

function countTreeNodes(nodes: readonly TreeNode[]): number {
  if (!Array.isArray(nodes)) return 0;
  let count = 0;
  for (const node of nodes) {
    count += 1;
    if (node.children) {
      count += countTreeNodes(node.children);
    }
  }
  return count;
}

function AnalyzeContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const { logs, addLog, clearLogs } = useLogger();
  const github = useGitHubRepo();
  const ai = useAIAnalysis();

  const panel = usePanelLayout();
  const repoUrl = searchParams.get('repo') ?? '';
  const hasTriggered = useRef(false);

  const runAnalysis = useCallback(
    async (url: string, provider: AIProviderName): Promise<void> => {
      addLog('info', t('log.messages.repoValidating'));

      let result: { readonly repoInfo: { readonly fullName: string; readonly name: string; readonly defaultBranch: string }; readonly tree: readonly TreeNode[] };
      try {
        const fetched = await github.validateAndFetch(url);
        if (!fetched) {
          addLog('error', t('log.messages.repoInvalid'));
          return;
        }
        result = fetched;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown';
        addLog('error', interpolate(t('log.messages.repoFetchFailed'), { error: message }));
        return;
      }

      addLog('success', t('log.messages.repoValidated'));
      addLog('info', t('log.messages.treeFetching'));

      const treeNodes = result.tree;
      const flatCount = countTreeNodes(treeNodes);
      addLog(
        'success',
        interpolate(t('log.messages.treeFetched'), { count: flatCount }),
      );

      const codeFiles = filterCodeFiles(treeNodes);
      addLog(
        'info',
        interpolate(t('log.messages.filesFiltered'), {
          count: codeFiles.length,
          total: flatCount,
        }),
      );

      addLog(
        'info',
        interpolate(t('log.messages.aiStarted'), { provider }),
      );

      const [owner, repo] = result.repoInfo.fullName.split('/');
      const startTime = Date.now();
      const aiResult = await ai.analyze(codeFiles, result.repoInfo.name, { provider, owner, repo });
      const duration = Date.now() - startTime;

      if (aiResult) {
        addLog(
          'success',
          interpolate(t('log.messages.aiComplete'), {
            duration: String(duration),
          }),
          { label: 'AI Response', data: aiResult },
        );
      } else {
        addLog(
          'error',
          interpolate(t('log.messages.aiFailed'), {
            error: ai.error ?? 'Unknown',
          }),
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, addLog],
  );

  useEffect(() => {
    if (repoUrl && !hasTriggered.current) {
      hasTriggered.current = true;
      runAnalysis(repoUrl, 'claude');
    }
  }, [repoUrl, runAnalysis]);

  const handleAnalyze = useCallback(
    (url: string, provider: AIProviderName): void => {
      hasTriggered.current = true;
      runAnalysis(url, provider);
    },
    [runAnalysis],
  );

  const handleRetryAI = useCallback((provider: AIProviderName): void => {
    if (github.tree.length > 0 && github.repoInfo) {
      const codeFiles = filterCodeFiles(github.tree);
      addLog(
        'info',
        interpolate(t('log.messages.aiStarted'), { provider }),
      );
      const startTime = Date.now();
      const [owner, repo] = github.repoInfo.fullName.split('/');
      ai.analyze(codeFiles, github.repoInfo.name, { provider, owner, repo }).then((result) => {
        const duration = Date.now() - startTime;
        if (result) {
          addLog(
            'success',
            interpolate(t('log.messages.aiComplete'), { duration: String(duration) }),
          );
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [github.tree, github.repoInfo, t, addLog]);

  const handleSelectFile = useCallback(
    (path: string): void => {
      github.selectFile(path);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [github.selectFile],
  );

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-300 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Logo compact />
          </Link>
          {github.repoInfo && (
            <span className="text-sm text-gray-500 dark:text-slate-400 font-mono">
              {github.repoInfo.fullName}
            </span>
          )}
          {github.loading && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <PanelToggle visibility={panel.visibility} onToggle={panel.togglePanel} />
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
      </header>

      {/* Three-panel layout */}
      <main
        ref={panel.containerRef}
        className={`flex flex-1 min-h-0 flex-col md:flex-row ${panel.isDragging ? 'select-none' : ''}`}
      >
        {/* Left Panel */}
        {panel.visibility.left && (
          <div
            className="h-64 md:h-auto overflow-hidden shrink-0"
            style={{ width: panel.widths[0] || undefined }}
          >
            <LeftPanel
              repoUrl={repoUrl}
              logs={logs}
              aiResult={ai.result}
              aiLoading={ai.loading}
              aiError={ai.error}
              onAnalyze={handleAnalyze}
              onClearLogs={clearLogs}
              onRetryAI={handleRetryAI}
              onSelectFile={handleSelectFile}
            />
          </div>
        )}

        {/* Handle between left and center */}
        {panel.visibility.left && panel.visibility.center && (
          <SplitHandle {...panel.getHandleProps(0)} />
        )}

        {/* Center Panel - File Tree */}
        {panel.visibility.center && (
          <div
            className="h-48 md:h-auto overflow-hidden shrink-0"
            style={{ width: panel.widths[1] || undefined }}
          >
            <FileTreePanel
              tree={github.tree}
              loading={github.treeLoading}
              selectedPath={github.selectedFile}
              onSelectFile={handleSelectFile}
            />
          </div>
        )}

        {/* Handle between center and right */}
        {panel.visibility.center && panel.visibility.right && (
          <SplitHandle {...panel.getHandleProps(1)} />
        )}

        {/* Right Panel - Code Viewer */}
        {panel.visibility.right && (
          <div
            className="h-64 md:h-auto overflow-hidden shrink-0"
            style={{ width: panel.widths[2] || undefined }}
          >
            <CodeViewerPanel
              fileContent={github.fileContent}
              loading={github.fileLoading}
              error={github.error}
              selectedPath={github.selectedFile}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default function AnalyzePage(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-950">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      }
    >
      <AnalyzeContent />
    </Suspense>
  );
}
