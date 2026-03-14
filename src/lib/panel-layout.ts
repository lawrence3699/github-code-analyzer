/**
 * Pure functions for four-panel resizable layout.
 * All logic is side-effect free and easily testable.
 */

/** Minimum panel width in pixels */
export const MIN_PANEL_WIDTH = 200;

/** Default panel ratios: left=0.15, center=0.2, right=0.3, callGraph=0.35 */
export const DEFAULT_RATIOS: readonly [number, number, number, number] = [0.15, 0.2, 0.3, 0.35];

export interface PanelVisibility {
  readonly left: boolean;
  readonly center: boolean;
  readonly right: boolean;
  readonly callGraph: boolean;
}

const PANEL_KEYS: readonly ('left' | 'center' | 'right' | 'callGraph')[] = [
  'left',
  'center',
  'right',
  'callGraph',
];

/**
 * Compute pixel widths for each panel given ratios, visibility, and container width.
 * Hidden panels get 0 width; visible panels share space proportionally.
 */
export function computePanelWidths(
  ratios: readonly [number, number, number, number],
  visibility: PanelVisibility,
  containerWidth: number,
): readonly [number, number, number, number] {
  if (containerWidth <= 0) return [0, 0, 0, 0];

  const visibleFlags = [
    visibility.left,
    visibility.center,
    visibility.right,
    visibility.callGraph,
  ];
  const visibleRatioSum = ratios.reduce(
    (sum, r, i) => sum + (visibleFlags[i] ? r : 0),
    0,
  );

  if (visibleRatioSum === 0) return [0, 0, 0, 0];

  // Compute floored widths and track the remainder to avoid rounding drift.
  // The last visible panel absorbs any leftover pixels so the sum is exact.
  let allocated = 0;
  let lastVisibleIdx = -1;
  const widths = ratios.map((r, i) => {
    if (!visibleFlags[i]) return 0;
    lastVisibleIdx = i;
    const w = Math.floor((r / visibleRatioSum) * containerWidth);
    allocated += w;
    return w;
  });

  if (lastVisibleIdx >= 0) {
    widths[lastVisibleIdx] += containerWidth - allocated;
  }

  return widths as unknown as readonly [number, number, number, number];
}

/**
 * Compute new ratios after dragging a handle.
 * handleIndex: 0 = between left and center,
 *              1 = between center and right,
 *              2 = between right and callGraph.
 * deltaPixels: positive = move right, negative = move left.
 * Enforces MIN_PANEL_WIDTH constraints.
 */
export function computeNewRatios(
  currentRatios: readonly [number, number, number, number],
  handleIndex: 0 | 1 | 2,
  deltaPixels: number,
  containerWidth: number,
): readonly [number, number, number, number] {
  if (containerWidth <= 0 || deltaPixels === 0) {
    return currentRatios;
  }

  const deltaRatio = deltaPixels / containerWidth;
  const leftIdx = handleIndex;
  const rightIdx = handleIndex + 1;
  const minRatio = MIN_PANEL_WIDTH / containerWidth;

  const newRatios: [number, number, number, number] = [
    currentRatios[0],
    currentRatios[1],
    currentRatios[2],
    currentRatios[3],
  ];

  let newLeft = newRatios[leftIdx] + deltaRatio;
  let newRight = newRatios[rightIdx] - deltaRatio;

  // Clamp both sides to minimum
  if (newLeft < minRatio) {
    const correction = minRatio - newLeft;
    newLeft = minRatio;
    newRight -= correction;
  }
  if (newRight < minRatio) {
    const correction = minRatio - newRight;
    newRight = minRatio;
    newLeft -= correction;
  }

  newRatios[leftIdx] = newLeft;
  newRatios[rightIdx] = newRight;

  return newRatios;
}

/**
 * Toggle a panel's visibility. Ensures at least one panel stays visible.
 * Returns new visibility, or the same object if toggle would hide the last panel.
 */
export function togglePanelVisibility(
  current: PanelVisibility,
  panel: 'left' | 'center' | 'right' | 'callGraph',
): PanelVisibility {
  // If panel is currently visible and it's the last one, don't hide it
  if (current[panel] && visiblePanelCount(current) <= 1) {
    return current;
  }

  return {
    ...current,
    [panel]: !current[panel],
  };
}

/**
 * Count how many panels are currently visible.
 */
export function visiblePanelCount(visibility: PanelVisibility): number {
  return PANEL_KEYS.filter((k) => visibility[k]).length;
}
