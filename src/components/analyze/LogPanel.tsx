'use client';

import { useEffect, useRef, useMemo } from 'react';
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
} from 'lucide-react';
import clsx from 'clsx';
import type { LogEntry, LogLevel } from '../../types/log';
import { truncateJsonValues } from '../../lib/logger';
import { useLocale } from '../../hooks/useLocale';
import { Collapsible } from '../ui/Collapsible';
import { Button } from '../ui/Button';

interface LogPanelProps {
  readonly logs: readonly LogEntry[];
  readonly onClear: () => void;
}

const MAX_VISIBLE_ENTRIES = 100;

const LEVEL_CONFIG: Record<LogLevel, {
  readonly icon: typeof Info;
  readonly colorClass: string;
}> = {
  info: { icon: Info, colorClass: 'text-blue-400' },
  success: { icon: CheckCircle2, colorClass: 'text-green-400' },
  warning: { icon: AlertTriangle, colorClass: 'text-yellow-400' },
  error: { icon: XCircle, colorClass: 'text-red-400' },
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function LogEntryItem({ entry }: { readonly entry: LogEntry }): React.ReactElement {
  const config = LEVEL_CONFIG[entry.level];
  const Icon = config.icon;

  const content = (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <Icon className={clsx('h-4 w-4 shrink-0', config.colorClass)} />
      <span className="text-gray-400 dark:text-slate-500 text-xs font-mono shrink-0">
        {formatTime(entry.timestamp)}
      </span>
      <span className="text-gray-600 dark:text-slate-300 truncate">{entry.message}</span>
    </div>
  );

  if (!entry.detail) {
    return <div className="px-2">{content}</div>;
  }

  const truncatedData = truncateJsonValues(entry.detail.data);

  return (
    <Collapsible title={content} className="px-2">
      <div className="ml-6 mt-1 mb-2">
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">{entry.detail.label}</p>
        <pre className="text-xs text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800/50 rounded-md p-2 overflow-x-auto max-h-48 overflow-y-auto">
          {JSON.stringify(truncatedData, null, 2)}
        </pre>
      </div>
    </Collapsible>
  );
}

export function LogPanel({ logs, onClear }: LogPanelProps): React.ReactElement {
  const { t } = useLocale();
  const scrollRef = useRef<HTMLDivElement>(null);

  const visibleLogs = useMemo(
    () => logs.slice(-MAX_VISIBLE_ENTRIES),
    [logs],
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleLogs]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-slate-700">
        <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300">
          {t('analyze.logs.title')}
        </h3>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <Trash2 className="h-3 w-3" />
          {t('analyze.logs.clear')}
        </Button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        {visibleLogs.length === 0 ? (
          <p className="px-3 py-4 text-sm text-gray-400 dark:text-slate-500 text-center">
            {t('analyze.logs.noLogs')}
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {visibleLogs.map((entry) => (
              <LogEntryItem key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
