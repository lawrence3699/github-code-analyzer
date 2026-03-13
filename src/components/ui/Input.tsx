'use client';

import clsx from 'clsx';

interface InputProps {
  readonly value: string;
  readonly onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly placeholder?: string;
  readonly label?: string;
  readonly error?: string;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly type?: string;
}

export function Input({
  value,
  onChange,
  placeholder,
  label,
  error,
  className,
  disabled = false,
  type = 'text',
}: InputProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-gray-500 dark:text-slate-400">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={clsx(
          'w-full rounded-lg border bg-gray-100 dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100',
          'placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none transition-colors',
          'focus:ring-2 focus:ring-blue-500/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-red-500/50' : 'border-gray-200 dark:border-slate-700',
          className,
        )}
      />
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
