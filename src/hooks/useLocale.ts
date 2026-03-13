'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { getTranslation, type Locale } from '../i18n';

interface UseLocaleReturn {
  readonly locale: Locale;
  readonly t: (key: string) => string;
  readonly setLocale: (l: Locale) => void;
}

const DEFAULT_LOCALE: Locale = 'en';
const STORAGE_KEY = 'locale';

function isValidLocale(value: string | null): value is Locale {
  return value === 'en' || value === 'zh';
}

// External store for locale — avoids setState-in-effect lint errors
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const stored = localStorage.getItem(STORAGE_KEY);
  return isValidLocale(stored) ? stored : DEFAULT_LOCALE;
}

function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

function writeLocale(l: Locale): void {
  localStorage.setItem(STORAGE_KEY, l);
  listeners.forEach(fn => fn());
}

export function useLocale(): UseLocaleReturn {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // On mount: one-time URL param backward compat, then browser language detection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (isValidLocale(urlLang)) {
      if (urlLang !== localStorage.getItem(STORAGE_KEY)) {
        writeLocale(urlLang);
      }
      return;
    }
    // If no stored locale yet, detect from browser language
    if (!localStorage.getItem(STORAGE_KEY)) {
      const browserLang = navigator.language.toLowerCase();
      const detected: Locale = browserLang.startsWith('zh') ? 'zh' : 'en';
      writeLocale(detected);
    }
  }, []);

  const t = useCallback(
    (key: string): string => getTranslation(locale, key),
    [locale],
  );

  const setLocale = useCallback(
    (l: Locale): void => {
      writeLocale(l);
    },
    [],
  );

  return useMemo(
    () => ({ locale, t, setLocale }),
    [locale, t, setLocale],
  );
}
