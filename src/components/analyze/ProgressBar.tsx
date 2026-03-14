'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { useLocale } from '../../hooks/useLocale';
import { interpolate } from '../../i18n';

type PipelinePhase = 'repo' | 'tree' | 'ai' | 'entry' | 'callGraph';

interface ProgressBarProps {
  readonly repoLoading: boolean;
  readonly treeLoading: boolean;
  readonly aiLoading: boolean;
  readonly entryVerifying: boolean;
  readonly entryProgress: { readonly current: number; readonly total: number };
  readonly entryCurrentFile: string | null;
  readonly callGraphAnalyzing: boolean;
  readonly callGraphStats: { readonly analyzed: number; readonly total: number };
  readonly callGraphCurrentFunction: string | null;
  readonly isComplete: boolean;
  readonly onCancel: () => void;
}

interface PhaseInfo {
  readonly key: PipelinePhase;
  readonly status: 'pending' | 'active' | 'completed';
}

function computePhases(props: ProgressBarProps): readonly PhaseInfo[] {
  const {
    repoLoading,
    treeLoading,
    aiLoading,
    entryVerifying,
    callGraphAnalyzing,
    isComplete,
  } = props;

  // Determine which phase is currently active
  const activePhase: PipelinePhase | null = repoLoading
    ? 'repo'
    : treeLoading
      ? 'tree'
      : aiLoading
        ? 'ai'
        : entryVerifying
          ? 'entry'
          : callGraphAnalyzing
            ? 'callGraph'
            : null;

  const phaseOrder: readonly PipelinePhase[] = ['repo', 'tree', 'ai', 'entry', 'callGraph'];

  if (isComplete) {
    return phaseOrder.map((key) => ({ key, status: 'completed' as const }));
  }

  if (activePhase === null) {
    return phaseOrder.map((key) => ({ key, status: 'pending' as const }));
  }

  const activeIndex = phaseOrder.indexOf(activePhase);

  return phaseOrder.map((key, i) => ({
    key,
    status: i < activeIndex ? 'completed' as const : i === activeIndex ? 'active' as const : 'pending' as const,
  }));
}

function getPhaseLabel(
  phase: PhaseInfo,
  t: (key: string) => string,
  props: ProgressBarProps,
): string {
  switch (phase.key) {
    case 'repo':
      return t('analyze.progress.repoValidation');
    case 'tree':
      return t('analyze.progress.fetchingTree');
    case 'ai':
      return t('analyze.progress.aiAnalysis');
    case 'entry':
      return interpolate(t('analyze.progress.entryVerification'), {
        current: props.entryProgress.current,
        total: props.entryProgress.total,
      });
    case 'callGraph':
      return interpolate(t('analyze.progress.callGraph'), {
        analyzed: props.callGraphStats.analyzed,
        total: props.callGraphStats.total,
      });
  }
}

function getCurrentActionText(props: ProgressBarProps): string | null {
  if (props.entryVerifying && props.entryCurrentFile) {
    return props.entryCurrentFile;
  }
  if (props.callGraphAnalyzing && props.callGraphCurrentFunction) {
    return props.callGraphCurrentFunction;
  }
  return null;
}

export function ProgressBar(props: ProgressBarProps): React.ReactElement {
  const { t } = useLocale();
  const { isComplete, onCancel } = props;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const phases = useMemo(() => computePhases(props), [
    props.repoLoading,
    props.treeLoading,
    props.aiLoading,
    props.entryVerifying,
    props.callGraphAnalyzing,
    props.isComplete,
  ]);

  const activePhase = phases.find((p) => p.status === 'active') ?? null;
  const actionText = getCurrentActionText(props);
  const isAnyLoading = props.repoLoading || props.treeLoading || props.aiLoading || props.entryVerifying || props.callGraphAnalyzing;

  return (
    <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700 shrink-0">
      {/* Header row: title + cancel */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600 dark:text-slate-300">
          {isComplete ? t('analyze.progress.complete') : t('analyze.progress.title')}
        </span>
        {isAnyLoading && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded
              text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30
              transition-colors"
            title={t('analyze.progress.cancelAll')}
          >
            <X className="h-3 w-3" />
            {t('analyze.progress.cancelAll')}
          </button>
        )}
      </div>

      {/* Step dots / segments */}
      <div className="flex items-center gap-1">
        {phases.map((phase, i) => (
          <div key={phase.key} className="flex items-center flex-1">
            {/* Segment line (before dot, skip first) */}
            {i > 0 && (
              <div
                className={clsx(
                  'h-0.5 flex-1 rounded-full transition-colors',
                  phase.status === 'completed'
                    ? 'bg-green-500 dark:bg-green-400'
                    : phase.status === 'active'
                      ? 'bg-blue-300 dark:bg-blue-600'
                      : 'bg-gray-200 dark:bg-slate-700',
                )}
              />
            )}
            {/* Dot */}
            <div
              className={clsx(
                'h-2.5 w-2.5 rounded-full shrink-0 transition-colors',
                phase.status === 'completed' && 'bg-green-500 dark:bg-green-400',
                phase.status === 'active' && 'bg-blue-500 dark:bg-blue-400 animate-pulse',
                phase.status === 'pending' && 'bg-gray-300 dark:bg-slate-600',
              )}
              title={getPhaseLabel(phase, t, props)}
            />
          </div>
        ))}
      </div>

      {/* Current phase label */}
      {activePhase && (
        <div className="mt-1.5 text-xs text-gray-500 dark:text-slate-400 truncate">
          {getPhaseLabel(activePhase, t, props)}
          {actionText && (
            <span className="ml-1 font-mono text-gray-400 dark:text-slate-500">
              {actionText}
            </span>
          )}
        </div>
      )}

      {/* Complete indicator */}
      {isComplete && (
        <div className="mt-1.5 text-xs text-green-600 dark:text-green-400">
          {t('analyze.progress.complete')}
        </div>
      )}
    </div>
  );
}
