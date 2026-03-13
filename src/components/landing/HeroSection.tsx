'use client';

import { useLocale } from '../../hooks/useLocale';

export function HeroSection(): React.ReactElement {
  const { t } = useLocale();

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h2 className="max-w-2xl text-xl font-medium text-gray-700 dark:text-slate-200 leading-relaxed">
        {t('landing.tagline')}
      </h2>
      <p className="text-sm text-gray-500 dark:text-slate-400">
        {t('common.appDescription')}
      </p>
    </div>
  );
}
