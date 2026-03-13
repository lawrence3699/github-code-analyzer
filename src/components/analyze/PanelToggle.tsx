'use client';

import { PanelLeft, FolderTree, Code2 } from 'lucide-react';
import { useLocale } from '../../hooks/useLocale';
import type { PanelVisibility } from '../../lib/panel-layout';

interface PanelToggleProps {
  readonly visibility: PanelVisibility;
  readonly onToggle: (panel: 'left' | 'center' | 'right') => void;
}

const PANELS = [
  { key: 'left' as const, Icon: PanelLeft, i18nKey: 'analyze.panelToggle.left' },
  { key: 'center' as const, Icon: FolderTree, i18nKey: 'analyze.panelToggle.center' },
  { key: 'right' as const, Icon: Code2, i18nKey: 'analyze.panelToggle.right' },
] as const;

export function PanelToggle({ visibility, onToggle }: PanelToggleProps): React.ReactElement {
  const { t } = useLocale();

  return (
    <div className="flex items-center gap-0.5 border border-gray-200 dark:border-slate-700 rounded-md p-0.5">
      {PANELS.map(({ key, Icon, i18nKey }) => {
        const isVisible = visibility[key];
        return (
          <button
            key={key}
            type="button"
            title={t(i18nKey)}
            aria-label={t(i18nKey)}
            aria-pressed={isVisible}
            onClick={() => onToggle(key)}
            className={`p-1 rounded transition-colors ${
              isVisible
                ? 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200'
                : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
