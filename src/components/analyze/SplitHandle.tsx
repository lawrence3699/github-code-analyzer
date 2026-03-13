'use client';

interface SplitHandleProps {
  readonly onMouseDown: (e: React.MouseEvent) => void;
  readonly style?: React.CSSProperties;
}

export function SplitHandle({ onMouseDown, style }: SplitHandleProps): React.ReactElement {
  return (
    <div
      className="shrink-0 w-1 bg-gray-200 dark:bg-slate-700 hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors relative group"
      style={{ cursor: 'col-resize', ...style }}
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
    >
      {/* Wider invisible hit area */}
      <div className="absolute inset-y-0 -left-1 -right-1" />
      {/* Visual indicator dots */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-0.5 h-0.5 rounded-full bg-blue-600 dark:bg-blue-300" />
        <div className="w-0.5 h-0.5 rounded-full bg-blue-600 dark:bg-blue-300" />
        <div className="w-0.5 h-0.5 rounded-full bg-blue-600 dark:bg-blue-300" />
      </div>
    </div>
  );
}
