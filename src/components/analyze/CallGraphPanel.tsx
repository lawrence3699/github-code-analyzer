'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Network, ZoomIn, ZoomOut, Maximize2, Minimize2, X } from 'lucide-react';
import { useLocale } from '../../hooks/useLocale';
import { interpolate } from '../../i18n';
import type { CallGraphNode } from '../../types/ai';

interface CallGraphStats {
  readonly analyzed: number;
  readonly total: number;
  readonly depth: number;
}

interface CallGraphPanelProps {
  readonly callGraph: CallGraphNode | null;
  readonly loading: boolean;
  readonly stats?: CallGraphStats;
  readonly currentFunction?: string | null;
  readonly onCancel?: () => void;
  readonly selectedFile?: string | null;
  readonly onManualEntry?: (filePath: string, functionName: string) => void;
  readonly onNodeClick?: (filePath: string, functionName: string) => void;
}

// ===== Layout constants — vertical top-down trunk layout =====
const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;
const BRANCH_LENGTH = 60;   // horizontal distance from trunk to child node
const LEVEL_GAP = 50;       // vertical gap between rows
const PADDING = 40;         // canvas padding
const MIN_SCALE = 0.3;
const MAX_SCALE = 3.0;
const SCALE_STEP = 0.1;

// ===== Layout types =====
interface LayoutNode {
  readonly id: string;
  readonly renderKey: string;
  readonly x: number;
  readonly y: number;
  readonly node: CallGraphNode;
  readonly children: readonly LayoutNode[];
}

// ===== Status styles =====
const STATUS_BODY_BG: Readonly<Record<string, string>> = {
  analyzed: 'bg-white dark:bg-slate-900',
  pending: 'bg-blue-50/50 dark:bg-blue-950/30',
  skipped: 'bg-gray-50 dark:bg-slate-800/50',
  not_found: 'bg-red-50/50 dark:bg-red-950/30',
};

const STATUS_DOT_COLORS: Readonly<Record<string, string>> = {
  analyzed: 'bg-green-500',
  pending: 'bg-blue-500',
  skipped: 'bg-gray-400',
  not_found: 'bg-red-500',
};

// ===== Vertical trunk layout =====

/** Compute total vertical space a subtree occupies */
function computeSubtreeHeight(node: CallGraphNode): number {
  if (node.children.length === 0) {
    return NODE_HEIGHT;
  }

  const childrenHeight = node.children.reduce(
    (sum, child) => sum + computeSubtreeHeight(child),
    0,
  );
  const gapsBetweenChildren = (node.children.length - 1) * LEVEL_GAP;

  return NODE_HEIGHT + LEVEL_GAP + childrenHeight + gapsBetweenChildren;
}

/** Layout nodes top-down: parent above, children stacked below and to the right */
function computeLayout(node: CallGraphNode, x: number, y: number, counter: { value: number } = { value: 0 }): LayoutNode {
  const renderKey = `node-${counter.value++}`;

  if (node.children.length === 0) {
    return { id: node.id, renderKey, x, y, node, children: [] };
  }

  const trunkX = x + NODE_WIDTH / 2;
  const childX = trunkX + BRANCH_LENGTH;
  let currentY = y + NODE_HEIGHT + LEVEL_GAP;

  const layoutChildren = node.children.map((child) => {
    const childLayout = computeLayout(child, childX, currentY, counter);
    currentY += computeSubtreeHeight(child) + LEVEL_GAP;
    return childLayout;
  });

  return { id: node.id, renderKey, x, y, node, children: layoutChildren };
}

// ===== SVG edge rendering (dashed trunk + branches) =====
function renderEdges(layout: LayoutNode): React.ReactElement[] {
  const edges: React.ReactElement[] = [];
  if (layout.children.length === 0) return edges;

  const trunkX = layout.x + NODE_WIDTH / 2;
  const trunkStartY = layout.y + NODE_HEIGHT;
  const lastChild = layout.children[layout.children.length - 1];
  const trunkEndY = lastChild.y + NODE_HEIGHT / 2;

  // Vertical trunk line (dashed)
  edges.push(
    <line
      key={`trunk-${layout.renderKey}`}
      x1={trunkX}
      y1={trunkStartY}
      x2={trunkX}
      y2={trunkEndY}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeDasharray="8 6"
      strokeLinecap="round"
      className="text-gray-700 dark:text-slate-400"
    />,
  );

  // Horizontal branches to each child (dashed)
  for (const child of layout.children) {
    const childCenterY = child.y + NODE_HEIGHT / 2;

    edges.push(
      <line
        key={`branch-${layout.renderKey}-${child.renderKey}`}
        x1={trunkX}
        y1={childCenterY}
        x2={child.x}
        y2={childCenterY}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeDasharray="8 6"
        strokeLinecap="round"
        className="text-gray-700 dark:text-slate-400"
      />,
    );

    // Recurse for child's edges
    edges.push(...renderEdges(child));
  }

  return edges;
}

// ===== Clickable status check =====
const CLICKABLE_STATUSES = new Set(['analyzed', 'skipped']);

// ===== Node card component (two-section UML style) =====
function NodeCard({
  node,
  onClick,
  tooltip,
}: {
  readonly node: CallGraphNode;
  readonly onClick?: () => void;
  readonly tooltip?: string;
}): React.ReactElement {
  const isRoot = node.depth === 0;
  const bodyBg = STATUS_BODY_BG[node.status] ?? STATUS_BODY_BG.analyzed;
  const dotColor = STATUS_DOT_COLORS[node.status] ?? STATUS_DOT_COLORS.skipped;
  const isPending = node.status === 'pending';
  const borderWidth = isRoot ? 'border-[3px]' : 'border-2';
  const dividerWidth = isRoot ? 'border-b-[3px]' : 'border-b-2';
  const isClickable = CLICKABLE_STATUSES.has(node.status) && onClick != null;

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isClickable) return;
    e.stopPropagation();
    onClick?.();
  }, [isClickable, onClick]);

  return (
    <div
      className={`${borderWidth} border-gray-700 dark:border-slate-400 rounded-xl overflow-hidden shadow-md ${isClickable ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 transition-shadow' : ''}`}
      style={{ width: NODE_WIDTH }}
      title={isClickable ? tooltip : undefined}
      onClick={handleClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {/* Header: file path + status dot */}
      <div className={`px-3 py-1.5 ${dividerWidth} border-gray-700 dark:border-slate-400 bg-gray-100 dark:bg-slate-800`}>
        <div className="flex items-center gap-1.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
          <span className="text-xs font-mono text-gray-600 dark:text-slate-300 truncate">
            {node.filePath || 'unknown'}
          </span>
        </div>
      </div>
      {/* Body: function name + description */}
      <div className={`px-3 py-2 ${bodyBg} ${isPending ? 'animate-pulse' : ''}`}>
        <div className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
          {node.functionName}
        </div>
        {node.description && (
          <div className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 mt-0.5">
            {node.description}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Render all nodes recursively =====
function renderNodes(
  layout: LayoutNode,
  onNodeClick?: (filePath: string, functionName: string) => void,
  tooltip?: string,
): React.ReactElement[] {
  const nodes: React.ReactElement[] = [];
  const node = layout.node;

  const handleClick = CLICKABLE_STATUSES.has(node.status) && onNodeClick
    ? (): void => onNodeClick(node.filePath, node.functionName)
    : undefined;

  nodes.push(
    <div
      key={layout.renderKey}
      className="absolute"
      style={{ left: layout.x, top: layout.y }}
    >
      <NodeCard node={node} onClick={handleClick} tooltip={tooltip} />
    </div>,
  );

  for (const child of layout.children) {
    nodes.push(...renderNodes(child, onNodeClick, tooltip));
  }

  return nodes;
}

// ===== Compute total canvas size =====
function computeCanvasSize(layout: LayoutNode): { readonly width: number; readonly height: number } {
  let maxX = layout.x + NODE_WIDTH;
  let maxY = layout.y + NODE_HEIGHT;

  for (const child of layout.children) {
    const childSize = computeCanvasSize(child);
    maxX = Math.max(maxX, childSize.width);
    maxY = Math.max(maxY, childSize.height);
  }

  return { width: maxX, height: maxY };
}

// ===== Small toolbar button =====
function ToolbarButton({
  onClick,
  title,
  children,
}: {
  readonly onClick: () => void;
  readonly title: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
    >
      {children}
    </button>
  );
}

export function CallGraphPanel({ callGraph, loading, stats, currentFunction, onCancel, selectedFile, onManualEntry, onNodeClick }: CallGraphPanelProps): React.ReactElement {
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [manualFunctionName, setManualFunctionName] = useState('');

  // Pan & zoom state
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const dragRef = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Compute layout
  const layout = useMemo(() => {
    if (!callGraph) return null;
    return computeLayout(callGraph, PADDING, PADDING);
  }, [callGraph]);

  const canvasSize = useMemo(() => {
    if (!layout) return { width: 0, height: 0 };
    const size = computeCanvasSize(layout);
    return { width: size.width + PADDING * 2, height: size.height + PADDING * 2 };
  }, [layout]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(MAX_SCALE, prev + SCALE_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(MIN_SCALE, prev - SCALE_STEP));
  }, []);

  // Fullscreen toggle
  const handleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // ESC key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTx: translate.x,
      startTy: translate.y,
    };
    setIsDragging(true);
  }, [translate]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      const drag = dragRef.current;
      if (!drag) return;
      e.preventDefault();
      setTranslate({
        x: drag.startTx + (e.clientX - drag.startX),
        y: drag.startTy + (e.clientY - drag.startY),
      });
    };

    const handleMouseUp = (): void => {
      if (dragRef.current) {
        dragRef.current = null;
        setIsDragging(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((prev) => {
      const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
      return Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta));
    });
  }, []);

  // Header bar (shared between empty and graph states)
  const headerBar = (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 dark:border-slate-700 shrink-0">
      <Network className="h-3.5 w-3.5 text-gray-500 dark:text-slate-400" />
      <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200">
        {t('analyze.callGraph.title')}
      </h2>
      {loading && stats && stats.total > 0 && (
        <span className="text-xs text-blue-400 animate-pulse">
          {interpolate(t('analyze.callGraph.progress'), {
            analyzed: String(stats.analyzed),
            total: String(stats.total),
          })}
          {currentFunction && (
            <span className="ml-1 text-gray-400 dark:text-slate-500 font-mono">{currentFunction}</span>
          )}
        </span>
      )}
      {loading && !stats?.total && (
        <span className="text-xs text-blue-400 animate-pulse">{t('analyze.aiResult.analyzing')}</span>
      )}
      {loading && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          title={t('analyze.callGraph.cancelAnalysis')}
          className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      <div className="ml-auto flex items-center gap-0.5">
        <span className="text-xs text-gray-400 dark:text-slate-500 mr-1">
          {Math.round(scale * 100)}%
        </span>
        <ToolbarButton onClick={handleZoomOut} title={t('analyze.callGraph.zoomOut')}>
          <ZoomOut className="h-3 w-3" />
        </ToolbarButton>
        <ToolbarButton onClick={handleZoomIn} title={t('analyze.callGraph.zoomIn')}>
          <ZoomIn className="h-3 w-3" />
        </ToolbarButton>
        <ToolbarButton onClick={handleFullscreen} title={isFullscreen ? t('analyze.callGraph.exitFullscreen') : t('analyze.callGraph.fullscreen')}>
          {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </ToolbarButton>
      </div>
    </div>
  );

  // Wrapper class for fullscreen mode
  const wrapperClass = isFullscreen
    ? 'fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-slate-900'
    : 'h-full flex flex-col bg-gray-50 dark:bg-slate-900';

  // Manual entry form submit handler
  const handleManualEntrySubmit = useCallback(() => {
    if (selectedFile && manualFunctionName.trim() && onManualEntry) {
      onManualEntry(selectedFile, manualFunctionName.trim());
    }
  }, [selectedFile, manualFunctionName, onManualEntry]);

  const handleFunctionNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setManualFunctionName(e.target.value);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleManualEntrySubmit();
      }
    },
    [handleManualEntrySubmit],
  );

  const isManualEntryDisabled = !selectedFile || !manualFunctionName.trim();

  // Empty state
  if (!callGraph && !loading) {
    return (
      <div ref={panelRef} className={wrapperClass}>
        {headerBar}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <p className="text-sm text-gray-400 dark:text-slate-500">
            {t('analyze.callGraph.empty')}
          </p>

          {/* Manual entry form */}
          <div className="w-full max-w-xs space-y-3">
            <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
              {t('analyze.callGraph.manualEntryHint')}
            </p>

            {/* Selected file display */}
            <div>
              <input
                type="text"
                readOnly
                value={selectedFile ?? ''}
                placeholder={t('analyze.callGraph.selectFile')}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 placeholder-gray-400 dark:placeholder-slate-500 cursor-default"
              />
            </div>

            {/* Function name input */}
            <div>
              <input
                type="text"
                value={manualFunctionName}
                onChange={handleFunctionNameChange}
                onKeyDown={handleKeyDown}
                placeholder={t('analyze.callGraph.functionName')}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            {/* Start analysis button */}
            <button
              type="button"
              disabled={isManualEntryDisabled}
              onClick={handleManualEntrySubmit}
              className="w-full px-3 py-1.5 text-xs font-medium rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t('analyze.callGraph.startAnalysis')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={panelRef} className={wrapperClass}>
      {headerBar}

      <div
        ref={containerRef}
        className={`flex-1 overflow-hidden ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
      >
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: canvasSize.width,
            height: canvasSize.height,
            position: 'relative',
          }}
        >
          {layout && (
            <>
              <svg
                width={canvasSize.width}
                height={canvasSize.height}
                className="absolute inset-0 pointer-events-none"
              >
                {renderEdges(layout)}
              </svg>
              {renderNodes(layout, onNodeClick, t('analyze.callGraph.clickToView'))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
