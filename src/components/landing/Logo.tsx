'use client';

import { Braces } from 'lucide-react';
import clsx from 'clsx';

interface LogoProps {
  readonly compact?: boolean;
}

export function Logo({ compact = false }: LogoProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <Braces
        className={clsx(
          'text-blue-500 dark:text-blue-400',
          compact ? 'h-6 w-6' : 'h-10 w-10',
        )}
      />
      <span
        className={clsx(
          'font-bold bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent',
          compact ? 'text-lg' : 'text-3xl',
        )}
      >
        GitHub Code Analyzer
      </span>
    </div>
  );
}
