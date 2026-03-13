'use client';

import { useState, useCallback } from 'react';
import type { LogEntry } from '../../types/log';
import type { AIAnalysisResult, AIProviderName } from '../../types/ai';
import { useLocale } from '../../hooks/useLocale';
import { validateGitHubUrl } from '../../lib/validators';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { LogPanel } from './LogPanel';
import { AIAnalysisResult as AIResultDisplay } from './AIAnalysisResult';

interface LeftPanelProps {
  readonly repoUrl: string;
  readonly logs: readonly LogEntry[];
  readonly aiResult: AIAnalysisResult | null;
  readonly aiLoading: boolean;
  readonly aiError: string | null;
  readonly onAnalyze: (url: string, provider: AIProviderName) => void;
  readonly onClearLogs: () => void;
  readonly onRetryAI: (provider: AIProviderName) => void;
  readonly onSelectFile: (path: string) => void;
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
  onAnalyze,
  onClearLogs,
  onRetryAI,
  onSelectFile,
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

      {/* Log Panel */}
      <div className="flex-1 min-h-0">
        <LogPanel logs={logs} onClear={onClearLogs} />
      </div>
    </div>
  );
}
