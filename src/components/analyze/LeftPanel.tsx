'use client';

import { useState, useCallback } from 'react';
import { Download } from 'lucide-react';
import type { LogEntry } from '../../types/log';
import type { AIAnalysisResult, AIProviderName, CallGraphNode } from '../../types/ai';
import { useLocale } from '../../hooks/useLocale';
import { validateGitHubUrl } from '../../lib/validators';
import { exportAsJson, exportAsMarkdown } from '../../lib/export';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { LogPanel } from './LogPanel';
import { AIAnalysisResult as AIResultDisplay } from './AIAnalysisResult';
import { ProgressBar } from './ProgressBar';

interface ProgressData {
  readonly repoLoading: boolean;
  readonly treeLoading: boolean;
  readonly entryVerifying: boolean;
  readonly entryProgress: { readonly current: number; readonly total: number };
  readonly entryCurrentFile: string | null;
  readonly callGraphAnalyzing: boolean;
  readonly callGraphStats: { readonly analyzed: number; readonly total: number };
  readonly callGraphCurrentFunction: string | null;
  readonly isComplete: boolean;
}

interface LeftPanelProps {
  readonly repoUrl: string;
  readonly logs: readonly LogEntry[];
  readonly aiResult: AIAnalysisResult | null;
  readonly aiLoading: boolean;
  readonly aiError: string | null;
  readonly callGraph: CallGraphNode | null;
  readonly progress: ProgressData;
  readonly onAnalyze: (url: string, provider: AIProviderName) => void;
  readonly onClearLogs: () => void;
  readonly onRetryAI: (provider: AIProviderName) => void;
  readonly onSelectFile: (path: string) => void;
  readonly onCancelAll: () => void;
}

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

const PROVIDER_OPTIONS: readonly { value: AIProviderName; label: string }[] = [
  { value: 'claude', label: 'Claude (Haiku)' },
  { value: 'codex', label: 'Codex (GPT-4o-mini)' },
];

export function LeftPanel({
  repoUrl,
  logs,
  aiResult,
  aiLoading,
  aiError,
  callGraph,
  progress,
  onAnalyze,
  onClearLogs,
  onRetryAI,
  onSelectFile,
  onCancelAll,
}: LeftPanelProps): React.ReactElement {
  const { t } = useLocale();
  const [inputUrl, setInputUrl] = useState(repoUrl);
  const [provider, setProvider] = useState<AIProviderName>('claude');

  const validation = validateGitHubUrl(inputUrl);

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setInputUrl(e.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent): void => {
      e.preventDefault();
      if (validation.valid) {
        onAnalyze(inputUrl.trim(), provider);
      }
    },
    [validation.valid, inputUrl, provider, onAnalyze],
  );

  const handleRetry = useCallback((): void => {
    onRetryAI(provider);
  }, [onRetryAI, provider]);

  const handleExportJson = useCallback((): void => {
    if (!aiResult) return;
    const projectName = aiResult.project_name || 'analysis';
    const content = exportAsJson(aiResult, callGraph);
    triggerDownload(content, `${projectName}-analysis.json`, 'application/json');
  }, [aiResult, callGraph]);

  const handleExportMarkdown = useCallback((): void => {
    if (!aiResult) return;
    const projectName = aiResult.project_name || 'analysis';
    const content = exportAsMarkdown(aiResult, callGraph);
    triggerDownload(content, `${projectName}-analysis.md`, 'text/markdown');
  }, [aiResult, callGraph]);

  const showProgress =
    progress.repoLoading ||
    progress.treeLoading ||
    aiLoading ||
    progress.entryVerifying ||
    progress.callGraphAnalyzing ||
    progress.isComplete;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Compact repo input */}
      <form onSubmit={handleSubmit} className="px-3 py-2 border-b border-gray-200 dark:border-slate-700 shrink-0">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              value={inputUrl}
              onChange={handleUrlChange}
              placeholder={t('landing.inputPlaceholder')}
              label={t('analyze.leftPanel.repoInputLabel')}
              error={
                inputUrl.trim().length > 0 && !validation.valid
                  ? t(validation.error ?? 'landing.invalidUrl')
                  : undefined
              }
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!validation.valid || aiLoading}
            loading={aiLoading}
            className="self-end"
          >
            {t('analyze.leftPanel.analyzeButton')}
          </Button>
        </div>

        {/* Provider selection */}
        <div className="mt-2">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AIProviderName)}
            className="w-full rounded-md border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 px-2 py-1 text-xs text-gray-600 dark:text-slate-300 outline-none focus:ring-1 focus:ring-blue-500/50"
          >
            {PROVIDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </form>

      {/* Progress Bar */}
      {(showProgress) && (
        <ProgressBar
          repoLoading={progress.repoLoading}
          treeLoading={progress.treeLoading}
          aiLoading={aiLoading}
          entryVerifying={progress.entryVerifying}
          entryProgress={progress.entryProgress}
          entryCurrentFile={progress.entryCurrentFile}
          callGraphAnalyzing={progress.callGraphAnalyzing}
          callGraphStats={progress.callGraphStats}
          callGraphCurrentFunction={progress.callGraphCurrentFunction}
          isComplete={progress.isComplete}
          onCancel={onCancelAll}
        />
      )}

      {/* AI Analysis Result */}
      <div className="border-b border-gray-200 dark:border-slate-700 shrink-0 max-h-[40%] overflow-y-auto">
        <AIResultDisplay
          result={aiResult}
          loading={aiLoading}
          error={aiError}
          onRetry={handleRetry}
          onSelectFile={onSelectFile}
        />
      </div>

      {/* Export Toolbar */}
      {aiResult && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <span className="text-xs font-medium text-gray-500 dark:text-slate-400 mr-auto">
            {t('analyze.export.title')}
          </span>
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            title={t('analyze.export.json')}
          >
            <Download className="h-3 w-3" />
            JSON
          </button>
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            title={t('analyze.export.markdown')}
          >
            <Download className="h-3 w-3" />
            Markdown
          </button>
        </div>
      )}

      {/* Log Panel */}
      <div className="flex-1 min-h-0">
        <LogPanel logs={logs} onClear={onClearLogs} />
      </div>
    </div>
  );
}
