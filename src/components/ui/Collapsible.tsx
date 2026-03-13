'use client';

import { useState, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface CollapsibleProps {
  readonly title: React.ReactNode;
  readonly children: React.ReactNode;
  readonly defaultOpen?: boolean;
  readonly className?: string;
  readonly open?: boolean;
  readonly onToggle?: (isOpen: boolean) => void;
}

export function Collapsible({
  title,
  children,
  defaultOpen = false,
  className,
  open: controlledOpen,
  onToggle,
}: CollapsibleProps): React.ReactElement {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleToggle = useCallback((): void => {
    const nextState = !isOpen;
    if (controlledOpen === undefined) {
      setInternalOpen(nextState);
    }
    onToggle?.(nextState);
  }, [isOpen, controlledOpen, onToggle]);

  return (
    <div className={clsx('overflow-hidden', className)}>
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center gap-1 text-left"
      >
        <ChevronRight
          className={clsx(
            'h-4 w-4 text-gray-400 dark:text-slate-500 transition-transform duration-200',
            isOpen && 'rotate-90',
          )}
        />
        {title}
      </button>
      <div
        className={clsx(
          'transition-all duration-200 ease-in-out',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        {children}
      </div>
    </div>
  );
}
