'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import clsx from 'clsx';
import { useLocale } from '../../hooks/useLocale';
import { validateGitHubUrl } from '../../lib/validators';

export function RepoInput(): React.ReactElement {
  const { t } = useLocale();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [touched, setTouched] = useState(false);

  const validation = validateGitHubUrl(url);
  const showFeedback = touched && url.trim().length > 0;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setUrl(e.target.value);
      if (!touched) {
        setTouched(true);
      }
    },
    [touched],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent): void => {
      e.preventDefault();
      if (!validation.valid) return;
      router.push(
        `/analyze?repo=${encodeURIComponent(url.trim())}`,
      );
    },
    [validation.valid, url, router],
  );

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="relative">
        <input
          type="text"
          value={url}
          onChange={handleChange}
          placeholder={t('landing.inputPlaceholder')}
          className={clsx(
            'w-full rounded-xl border px-5 py-4 pr-12 text-lg',
            'bg-white/60 dark:bg-slate-900/60 text-gray-900 dark:text-slate-100',
            'placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none transition-all',
            'backdrop-blur-sm',
            'focus:ring-2 focus:ring-blue-500/50',
            showFeedback && validation.valid && 'border-green-500/50',
            showFeedback && !validation.valid && 'border-red-500/50',
            !showFeedback && 'border-gray-200/60 dark:border-slate-600/60',
          )}
        />
        {showFeedback && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {validation.valid ? (
              <Check className="h-5 w-5 text-green-500 dark:text-green-400" />
            ) : (
              <X className="h-5 w-5 text-red-500 dark:text-red-400" />
            )}
          </div>
        )}
      </div>

      {showFeedback && (
        <p
          className={clsx(
            'mt-2 text-sm',
            validation.valid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
          )}
        >
          {validation.valid
            ? t('landing.validUrl')
            : t(validation.error ?? 'landing.invalidUrl')}
        </p>
      )}

      <button
        type="submit"
        disabled={!validation.valid}
        className={clsx(
          'mt-4 w-full rounded-xl py-3.5 text-lg font-semibold text-white transition-all',
          'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600',
          'hover:from-blue-500 hover:via-purple-500 hover:to-pink-500',
          'hover:shadow-lg hover:shadow-purple-500/20',
          'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:via-purple-600 disabled:hover:to-pink-600 disabled:hover:shadow-none',
        )}
      >
        {t('landing.analyzeButton')}
      </button>
    </form>
  );
}
