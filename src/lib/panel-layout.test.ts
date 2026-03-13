import {
  computePanelWidths,
  computeNewRatios,
  togglePanelVisibility,
  visiblePanelCount,
  MIN_PANEL_WIDTH,
  DEFAULT_RATIOS,
  type PanelVisibility,
} from './panel-layout';

const ALL_VISIBLE: PanelVisibility = { left: true, center: true, right: true };

describe('panel-layout', () => {
  describe('computePanelWidths', () => {
    it('should distribute widths according to ratios when all panels visible', () => {
      const widths = computePanelWidths(DEFAULT_RATIOS, ALL_VISIBLE, 1000);
      expect(widths[0]).toBe(200);  // 0.2 * 1000
      expect(widths[1]).toBe(300);  // 0.3 * 1000
      expect(widths[2]).toBe(500);  // 0.5 * 1000
    });

    it('should give hidden panels 0 width and redistribute to visible ones', () => {
      const visibility: PanelVisibility = { left: false, center: true, right: true };
      const widths = computePanelWidths(DEFAULT_RATIOS, visibility, 1000);
      expect(widths[0]).toBe(0);
      // center and right should share 1000px proportionally: 0.3/(0.3+0.5) and 0.5/(0.3+0.5)
      expect(widths[1]).toBe(375);  // 0.375 * 1000
      expect(widths[2]).toBe(625);  // 0.625 * 1000
    });

    it('should give full width when only one panel visible', () => {
      const visibility: PanelVisibility = { left: false, center: true, right: false };
      const widths = computePanelWidths(DEFAULT_RATIOS, visibility, 1200);
      expect(widths[0]).toBe(0);
      expect(widths[1]).toBe(1200);
      expect(widths[2]).toBe(0);
    });

    it('should handle zero container width', () => {
      const widths = computePanelWidths(DEFAULT_RATIOS, ALL_VISIBLE, 0);
      expect(widths[0]).toBe(0);
      expect(widths[1]).toBe(0);
      expect(widths[2]).toBe(0);
    });

    it('should sum to containerWidth when all visible', () => {
      const widths = computePanelWidths([0.25, 0.35, 0.4], ALL_VISIBLE, 1000);
      expect(widths[0] + widths[1] + widths[2]).toBe(1000);
    });

    it('should sum to containerWidth when some hidden', () => {
      const visibility: PanelVisibility = { left: true, center: false, right: true };
      const widths = computePanelWidths([0.25, 0.35, 0.4], visibility, 800);
      expect(widths[0] + widths[1] + widths[2]).toBe(800);
    });
  });

  describe('computeNewRatios', () => {
    it('should adjust left and center ratios when dragging handle 0 right', () => {
      // drag handle 0 right by 100px in a 1000px container = 0.1 ratio shift
      const newRatios = computeNewRatios([0.2, 0.3, 0.5], 0, 100, 1000);
      expect(newRatios[0]).toBeCloseTo(0.3);
      expect(newRatios[1]).toBeCloseTo(0.2);
      expect(newRatios[2]).toBeCloseTo(0.5); // right unchanged
    });

    it('should adjust center and right ratios when dragging handle 1 left', () => {
      const newRatios = computeNewRatios([0.2, 0.3, 0.5], 1, -100, 1000);
      expect(newRatios[0]).toBeCloseTo(0.2);  // left unchanged
      expect(newRatios[1]).toBeCloseTo(0.2);
      expect(newRatios[2]).toBeCloseTo(0.6);
    });

    it('should enforce MIN_PANEL_WIDTH on the left panel', () => {
      // Try to shrink left panel below minimum: drag handle 0 left by 100px
      // left is 200px (0.2 * 1000), min is 200px, so it should clamp
      const newRatios = computeNewRatios([0.2, 0.3, 0.5], 0, -100, 1000);
      expect(newRatios[0] * 1000).toBeGreaterThanOrEqual(MIN_PANEL_WIDTH);
    });

    it('should enforce MIN_PANEL_WIDTH on adjacent panel', () => {
      // Try to shrink center panel below minimum: drag handle 0 right by 200px
      // center is 300px (0.3 * 1000), dragging right by 200 would make it 100px
      const newRatios = computeNewRatios([0.2, 0.3, 0.5], 0, 200, 1000);
      expect(newRatios[1] * 1000).toBeGreaterThanOrEqual(MIN_PANEL_WIDTH);
    });

    it('should not change ratios sum (always 1.0)', () => {
      const newRatios = computeNewRatios([0.2, 0.3, 0.5], 0, 50, 1000);
      const sum = newRatios[0] + newRatios[1] + newRatios[2];
      expect(sum).toBeCloseTo(1.0);
    });

    it('should handle zero delta', () => {
      const newRatios = computeNewRatios([0.2, 0.3, 0.5], 0, 0, 1000);
      expect(newRatios[0]).toBeCloseTo(0.2);
      expect(newRatios[1]).toBeCloseTo(0.3);
      expect(newRatios[2]).toBeCloseTo(0.5);
    });
  });

  describe('togglePanelVisibility', () => {
    it('should hide a visible panel', () => {
      const result = togglePanelVisibility(ALL_VISIBLE, 'left');
      expect(result.left).toBe(false);
      expect(result.center).toBe(true);
      expect(result.right).toBe(true);
    });

    it('should show a hidden panel', () => {
      const current: PanelVisibility = { left: false, center: true, right: true };
      const result = togglePanelVisibility(current, 'left');
      expect(result.left).toBe(true);
    });

    it('should not hide the last visible panel', () => {
      const current: PanelVisibility = { left: false, center: true, right: false };
      const result = togglePanelVisibility(current, 'center');
      // Should be unchanged since center is the only visible panel
      expect(result.center).toBe(true);
      expect(result).toEqual(current);
    });

    it('should allow hiding when two panels remain', () => {
      const current: PanelVisibility = { left: true, center: false, right: true };
      const result = togglePanelVisibility(current, 'left');
      expect(result.left).toBe(false);
      expect(result.right).toBe(true);
    });

    it('should not mutate original object', () => {
      const original: PanelVisibility = { left: true, center: true, right: true };
      const result = togglePanelVisibility(original, 'left');
      expect(original.left).toBe(true); // original unchanged
      expect(result.left).toBe(false);
    });
  });

  describe('visiblePanelCount', () => {
    it('should return 3 when all visible', () => {
      expect(visiblePanelCount(ALL_VISIBLE)).toBe(3);
    });

    it('should return 1 when only one visible', () => {
      expect(visiblePanelCount({ left: false, center: true, right: false })).toBe(1);
    });

    it('should return 0 when none visible', () => {
      expect(visiblePanelCount({ left: false, center: false, right: false })).toBe(0);
    });
  });
});
