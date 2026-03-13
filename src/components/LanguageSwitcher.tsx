'use client';

import { useLocale } from '../hooks/useLocale';
import clsx from 'clsx';

export function LanguageSwitcher(): React.ReactElement {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 p-0.5">
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={clsx(
          'rounded-md px-3 py-1 text-sm font-medium transition-colors',
          locale === 'en'
            ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100'
            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200',
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale('zh')}
        className={clsx(
          'rounded-md px-3 py-1 text-sm font-medium transition-colors',
          locale === 'zh'
            ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100'
            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200',
        )}
      >
        中文
      </button>
    </div>
  );
}
