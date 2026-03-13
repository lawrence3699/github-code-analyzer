'use client';

import clsx from 'clsx';

type BadgeColor = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink' | 'slate' | 'orange' | 'cyan';

interface BadgeProps {
  readonly children: React.ReactNode;
  readonly color?: BadgeColor;
  readonly className?: string;
}

const COLOR_CLASSES: Record<BadgeColor, string> = {
  blue: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
  green: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/30',
  yellow: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/30',
  red: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30',
  purple: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
  pink: 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-500/30',
  slate: 'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-500/30',
  orange: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/30',
  cyan: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30',
};

export function Badge({
  children,
  color = 'slate',
  className,
}: BadgeProps): React.ReactElement {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        COLOR_CLASSES[color],
        className,
      )}
    >
      {children}
    </span>
  );
}
