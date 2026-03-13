'use client';

import { useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import type { AIAnalysisResult as AIResult, TechStackItem } from '../../types/ai';
import { useLocale } from '../../hooks/useLocale';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface AIAnalysisResultProps {
  readonly result: AIResult | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onRetry?: () => void;
  readonly onSelectFile?: (path: string) => void;
}

type BadgeColor = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink' | 'slate' | 'orange' | 'cyan';

const LANGUAGE_COLORS: readonly BadgeColor[] = [
  'blue', 'purple', 'green', 'orange', 'pink', 'cyan', 'yellow', 'red',
];

const CATEGORY_COLORS: Record<TechStackItem['category'], BadgeColor> = {
  framework: 'purple',
  library: 'blue',
  tool: 'orange',
  runtime: 'green',
  database: 'red',
  testing: 'yellow',
  ci_cd: 'cyan',
  other: 'slate',
};

function groupByCategory(
  items: readonly TechStackItem[],
): Record<string, readonly TechStackItem[]> {
  const groups: Record<string, TechStackItem[]> = {};
  for (const item of items) {
    const existing = groups[item.category] ?? [];
    groups[item.category] = [...existing, item];
  }
  return groups;
}

function SkeletonLoader(): React.ReactElement {
  return (
    <div className="animate-pulse space-y-4 p-3">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
        <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-gray-200 dark:bg-slate-700 rounded" />
        <div className="h-3 w-3/4 bg-gray-200 dark:bg-slate-700 rounded" />
        <div className="h-3 w-1/2 bg-gray-200 dark:bg-slate-700 rounded" />
      </div>
      <div className="flex gap-2 flex-wrap">
        <div className="h-6 w-20 bg-gray-200 dark:bg-slate-700 rounded-full" />
        <div className="h-6 w-16 bg-gray-200 dark:bg-slate-700 rounded-full" />
        <div className="h-6 w-24 bg-gray-200 dark:bg-slate-700 rounded-full" />
      </div>
    </div>
  );
}

export function AIAnalysisResult({
  result,
  loading,
  error,
  onRetry,
  onSelectFile,
}: AIAnalysisResultProps): React.ReactElement {
  const { t } = useLocale();

  const handleFileClick = useCallback(
    (path: string): void => {
      onSelectFile?.(path);
    },
    [onSelectFile],
  );

  if (loading) {
    return (
      <div className="flex flex-col">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300">
            {t('analyze.aiResult.title')}
          </h3>
        </div>
        <p className="px-3 py-2 text-sm text-blue-400 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('analyze.aiResult.analyzing')}
        </p>
        <SkeletonLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300">
            {t('analyze.aiResult.title')}
          </h3>
        </div>
        <div className="p-3 space-y-2">
          <p className="text-sm text-red-400">{t('analyze.aiResult.error')}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">{error}</p>
          {onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              {t('analyze.aiResult.retry')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300">
            {t('analyze.aiResult.title')}
          </h3>
        </div>
        <p className="px-3 py-4 text-sm text-gray-400 dark:text-slate-500 text-center">
          {t('analyze.aiResult.noResult')}
        </p>
      </div>
    );
  }

  const techGroups = groupByCategory(result.tech_stack);

  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700">
        <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300">
          {t('analyze.aiResult.title')}
        </h3>
      </div>

      <div className="p-3 space-y-4 overflow-y-auto">
        {/* Languages */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase mb-2">
            {t('analyze.aiResult.languages')}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {result.primary_languages.map((lang, i) => (
              <Badge
                key={lang.language}
                color={LANGUAGE_COLORS[i % LANGUAGE_COLORS.length]}
              >
                {lang.language} {lang.percentage}%
              </Badge>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase mb-2">
            {t('analyze.aiResult.techStack')}
          </h4>
          <div className="space-y-2">
            {Object.entries(techGroups).map(([category, items]) => (
              <div key={category}>
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-1 capitalize">
                  {category.replace('_', '/')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((item) => (
                    <Badge
                      key={item.name}
                      color={CATEGORY_COLORS[item.category]}
                    >
                      {item.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Entry Files */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase mb-2">
            {t('analyze.aiResult.entryFiles')}
          </h4>
          <ul className="space-y-1">
            {result.entry_files.map((file) => (
              <li key={file.path}>
                <button
                  type="button"
                  onClick={() => handleFileClick(file.path)}
                  className="text-left w-full group"
                >
                  <span className="text-sm text-blue-400 group-hover:text-blue-300 transition-colors font-mono">
                    {file.path}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-slate-500 block ml-2">
                    {file.reason}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Summary */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase mb-2">
            {t('analyze.aiResult.summary')}
          </h4>
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
            {result.summary}
          </p>
        </div>
      </div>
    </div>
  );
}
