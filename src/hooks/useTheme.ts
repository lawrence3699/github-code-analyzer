'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

type Theme = 'dark' | 'light';

interface UseThemeReturn {
  readonly theme: Theme;
  readonly setTheme: (t: Theme) => void;
}

const DEFAULT_THEME: Theme = 'dark';
const STORAGE_KEY = 'theme';

function isValidTheme(value: string | null): value is Theme {
  return value === 'dark' || value === 'light';
}

// External store for theme — avoids setState-in-effect lint errors
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const stored = localStorage.getItem(STORAGE_KEY);
  return isValidTheme(stored) ? stored : DEFAULT_THEME;
}

function getServerSnapshot(): Theme {
  return DEFAULT_THEME;
}

function writeTheme(t: Theme): void {
  localStorage.setItem(STORAGE_KEY, t);
  listeners.forEach(l => l());
}

export function useTheme(): UseThemeReturn {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // On mount: one-time URL param backward compat — write to localStorage if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTheme = urlParams.get('theme');
    if (isValidTheme(urlTheme) && urlTheme !== localStorage.getItem(STORAGE_KEY)) {
      writeTheme(urlTheme);
    }
  }, []);

  // Sync document class whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const setTheme = useCallback(
    (t: Theme): void => {
      writeTheme(t);
    },
    [],
  );

  return useMemo(
    () => ({ theme, setTheme }),
    [theme, setTheme],
  );
}
