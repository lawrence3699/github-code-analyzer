'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  computePanelWidths,
  computeNewRatios,
  togglePanelVisibility,
  DEFAULT_RATIOS,
  type PanelVisibility,
} from '../lib/panel-layout';

export interface UsePanelLayoutReturn {
  /** Ref to attach to the container div */
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
  /** Current pixel widths for [left, center, right] */
  readonly widths: readonly [number, number, number];
  /** Panel visibility state */
  readonly visibility: PanelVisibility;
  /** Toggle a panel's visibility */
  readonly togglePanel: (panel: 'left' | 'center' | 'right') => void;
  /** Props to spread on handle elements */
  readonly getHandleProps: (index: 0 | 1) => {
    readonly onMouseDown: (e: React.MouseEvent) => void;
    readonly style: React.CSSProperties;
  };
  /** Whether a drag is in progress */
  readonly isDragging: boolean;
}

export function usePanelLayout(): UsePanelLayoutReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ratios, setRatios] = useState<readonly [number, number, number]>(DEFAULT_RATIOS);
  const [visibility, setVisibility] = useState<PanelVisibility>({
    left: true,
    center: true,
    right: true,
  });
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Track drag state in refs to avoid stale closures in global listeners
  const dragRef = useRef<{
    handleIndex: 0 | 1;
    startX: number;
    startRatios: readonly [number, number, number];
  } | null>(null);

  // Observe container width changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const widths = useMemo(
    () => computePanelWidths(ratios, visibility, containerWidth),
    [ratios, visibility, containerWidth],
  );

  const togglePanel = useCallback((panel: 'left' | 'center' | 'right') => {
    setVisibility((prev) => togglePanelVisibility(prev, panel));
  }, []);

  // Global mouse move/up handlers for drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      const drag = dragRef.current;
      if (!drag) return;
      e.preventDefault();
      const delta = e.clientX - drag.startX;
      const newRatios = computeNewRatios(
        drag.startRatios,
        drag.handleIndex,
        delta,
        containerWidth,
      );
      setRatios(newRatios);
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
  }, [containerWidth]);

  const getHandleProps = useCallback(
    (index: 0 | 1) => ({
      onMouseDown: (e: React.MouseEvent): void => {
        e.preventDefault();
        dragRef.current = {
          handleIndex: index,
          startX: e.clientX,
          startRatios: ratios,
        };
        setIsDragging(true);
      },
      style: {
        cursor: 'col-resize' as const,
      },
    }),
    [ratios],
  );

  return useMemo(
    () => ({
      containerRef,
      widths,
      visibility,
      togglePanel,
      getHandleProps,
      isDragging,
    }),
    [widths, visibility, togglePanel, getHandleProps, isDragging],
  );
}
