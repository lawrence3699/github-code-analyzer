'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useLocale } from '../../hooks/useLocale';
import { useLogger } from '../../hooks/useLogger';
import { useGitHubRepo } from '../../hooks/useGitHubRepo';
import { useAIAnalysis } from '../../hooks/useAIAnalysis';
import { useEntryVerification } from '../../hooks/useEntryVerification';
import { useCallGraph } from '../../hooks/useCallGraph';
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
import { CallGraphPanel } from '../../components/analyze/CallGraphPanel';
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

function flattenTreePaths(nodes: readonly TreeNode[]): readonly string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    if (node.type === 'blob') {
      paths.push(node.path);
    }
    if (node.children) {
      paths.push(...flattenTreePaths(node.children));
    }
  }
  return paths;
}

function AnalyzeContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const { logs, addLog, clearLogs } = useLogger();
  const github = useGitHubRepo();
  const ai = useAIAnalysis();
  const entryVerification = useEntryVerification();
  const callGraphHook = useCallGraph();

  const panel = usePanelLayout();
  const repoUrl = searchParams.get('repo') ?? '';
  const hasTriggered = useRef(false);

  const runAnalysis = useCallback(
    async (url: string, provider: AIProviderName): Promise<void> => {
      addLog('info', t('log.messages.repoValidating'));

      let result: { readonly repoInfo: { readonly fullName: string; readonly name: string; readonly defaultBranch: string; readonly description: string | null }; readonly tree: readonly TreeNode[] };
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

        // === Call Graph Pipeline: Entry Verification → Function Analysis ===
        if (aiResult.entry_files.length > 0) {
          const primaryLanguages = aiResult.primary_languages.map((l) => l.language);

          // Phase 1: Verify entry files
          for (const entry of aiResult.entry_files) {
            addLog('info', interpolate(t('log.messages.entryVerifyStart'), { path: entry.path }));
          }

          try {
            const verifiedEntry = await entryVerification.verifyEntryFiles(
              aiResult.entry_files,
              {
                owner,
                repo,
                repoName: result.repoInfo.name,
                repoDescription: result.repoInfo.description,
                primaryLanguages,
                summary: aiResult.summary,
              },
            );

            if (verifiedEntry) {
              addLog(
                'success',
                interpolate(t('log.messages.entryVerifyComplete'), {
                  path: verifiedEntry.path,
                  name: verifiedEntry.functionName,
                }),
              );

              // Phase 2 & 3: Analyze call graph
              const fileList = flattenTreePaths(treeNodes);
              addLog(
                'info',
                interpolate(t('log.messages.drillStart'), { depth: '2' }),
              );

              const cgResult = await callGraphHook.analyzeEntryFunction(
                verifiedEntry.path,
                verifiedEntry.functionName,
                {
                  owner,
                  repo,
                  repoName: result.repoInfo.name,
                  summary: aiResult.summary,
                  primaryLanguages,
                  fileList,
                },
              );

              if (cgResult.success) {
                addLog(
                  'success',
                  interpolate(t('log.messages.drillComplete'), {
                    total: String(cgResult.nodesAnalyzed),
                  }),
                );
              } else {
                addLog(
                  'warning',
                  interpolate(t('log.messages.callGraphFailed'), {
                    reason: cgResult.errorDetail ?? cgResult.reason ?? 'unknown',
                  }),
                );
              }
            } else {
              addLog('warning', t('log.messages.entryVerifyNone'));
            }
          } catch (err) {
            const detail = err instanceof Error ? err.message : 'Unknown';
            addLog('error', interpolate(t('log.messages.callGraphFailed'), { reason: detail }));
          }
        } else {
          addLog('info', t('log.messages.noEntryFiles'));
        }
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

  const handleNodeClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (filePath: string, _functionName: string): void => {
      github.selectFile(filePath);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [github.selectFile],
  );

  const handleManualEntry = useCallback(
    (filePath: string, functionName: string): void => {
      if (!github.repoInfo) return;

      const [owner, repo] = github.repoInfo.fullName.split('/');
      const fileList = flattenTreePaths(github.tree);
      const primaryLanguages = ai.result?.primary_languages.map((l) => l.language) ?? [];

      callGraphHook.analyzeEntryFunction(filePath, functionName, {
        owner,
        repo,
        repoName: github.repoInfo.name,
        summary: ai.result?.summary ?? '',
        primaryLanguages,
        fileList,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [github.repoInfo, github.tree, ai.result, callGraphHook.analyzeEntryFunction],
  );

  const handleCancelAll = useCallback((): void => {
    entryVerification.cancel();
    callGraphHook.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryVerification.cancel, callGraphHook.cancel]);

  const isAnyLoading =
    github.loading ||
    github.treeLoading ||
    ai.loading ||
    entryVerification.verifying ||
    callGraphHook.analyzing;

  const isComplete =
    !isAnyLoading &&
    ai.result !== null &&
    !entryVerification.verifying &&
    !callGraphHook.analyzing;

  const progressData = useMemo(
    () => ({
      repoLoading: github.loading,
      treeLoading: github.treeLoading,
      entryVerifying: entryVerification.verifying,
      entryProgress: entryVerification.progress,
      entryCurrentFile: entryVerification.currentFile,
      callGraphAnalyzing: callGraphHook.analyzing,
      callGraphStats: { analyzed: callGraphHook.stats.analyzed, total: callGraphHook.stats.total },
      callGraphCurrentFunction: callGraphHook.currentFunction,
      isComplete,
    }),
    [
      github.loading,
      github.treeLoading,
      entryVerification.verifying,
      entryVerification.progress,
      entryVerification.currentFile,
      callGraphHook.analyzing,
      callGraphHook.stats.analyzed,
      callGraphHook.stats.total,
      callGraphHook.currentFunction,
      isComplete,
    ],
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

      {/* Four-panel layout */}
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
              callGraph={callGraphHook.callGraph}
              progress={progressData}
              onAnalyze={handleAnalyze}
              onClearLogs={clearLogs}
              onRetryAI={handleRetryAI}
              onSelectFile={handleSelectFile}
              onCancelAll={handleCancelAll}
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
              owner={github.repoInfo?.fullName.split('/')[0]}
              repo={github.repoInfo?.fullName.split('/')[1]}
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

        {/* Handle between right and callGraph */}
        {panel.visibility.right && panel.visibility.callGraph && (
          <SplitHandle {...panel.getHandleProps(2)} />
        )}

        {/* Call Graph Panel */}
        {panel.visibility.callGraph && (
          <div
            className="h-64 md:h-auto overflow-hidden shrink-0"
            style={{ width: panel.widths[3] || undefined }}
          >
            <CallGraphPanel
              callGraph={callGraphHook.callGraph}
              loading={callGraphHook.analyzing}
              stats={callGraphHook.stats}
              currentFunction={callGraphHook.currentFunction}
              onCancel={callGraphHook.cancel}
              selectedFile={github.selectedFile}
              onManualEntry={handleManualEntry}
              onNodeClick={handleNodeClick}
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
