'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useLocale } from '../hooks/useLocale';

export function ThemeSwitcher(): React.ReactElement {
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
      aria-label={isDark ? t('common.lightMode') : t('common.darkMode')}
    >
      {isDark ? (
        <>
          <Sun className="h-4 w-4" />
          <span className="text-xs">{t('common.lightMode')}</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          <span className="text-xs">{t('common.darkMode')}</span>
        </>
      )}
    </button>
  );
}
