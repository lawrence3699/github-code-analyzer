import {
  computePanelWidths,
  computeNewRatios,
  togglePanelVisibility,
  visiblePanelCount,
  MIN_PANEL_WIDTH,
  DEFAULT_RATIOS,
  type PanelVisibility,
} from './panel-layout';

const ALL_VISIBLE: PanelVisibility = {
  left: true,
  center: true,
  right: true,
  callGraph: true,
};

describe('panel-layout', () => {
  describe('computePanelWidths', () => {
    it('should distribute widths according to ratios when all panels visible', () => {
      // DEFAULT_RATIOS = [0.15, 0.2, 0.3, 0.35], total = 1.0
      const widths = computePanelWidths(DEFAULT_RATIOS, ALL_VISIBLE, 1000);
      expect(widths[0]).toBe(150);  // 0.15 * 1000
      expect(widths[1]).toBe(200);  // 0.2  * 1000
      expect(widths[2]).toBe(300);  // 0.3  * 1000
      expect(widths[3]).toBe(350);  // 0.35 * 1000
    });

    it('should give hidden panels 0 width and redistribute to visible ones', () => {
      const visibility: PanelVisibility = {
        left: false,
        center: true,
        right: true,
        callGraph: false,
      };
      const widths = computePanelWidths(DEFAULT_RATIOS, visibility, 1000);
      expect(widths[0]).toBe(0);
      expect(widths[3]).toBe(0);
      // center and right share 1000px proportionally: 0.2/(0.2+0.3) and 0.3/(0.2+0.3)
      expect(widths[1]).toBe(400);  // 0.4 * 1000
      expect(widths[2]).toBe(600);  // 0.6 * 1000
    });

    it('should give full width when only one panel visible', () => {
      const visibility: PanelVisibility = {
        left: false,
        center: true,
        right: false,
        callGraph: false,
      };
      const widths = computePanelWidths(DEFAULT_RATIOS, visibility, 1200);
      expect(widths[0]).toBe(0);
      expect(widths[1]).toBe(1200);
      expect(widths[2]).toBe(0);
      expect(widths[3]).toBe(0);
    });

    it('should handle zero container width', () => {
      const widths = computePanelWidths(DEFAULT_RATIOS, ALL_VISIBLE, 0);
      expect(widths[0]).toBe(0);
      expect(widths[1]).toBe(0);
      expect(widths[2]).toBe(0);
      expect(widths[3]).toBe(0);
    });

    it('should sum to containerWidth when all visible', () => {
      const widths = computePanelWidths([0.1, 0.25, 0.3, 0.35], ALL_VISIBLE, 1000);
      expect(widths[0] + widths[1] + widths[2] + widths[3]).toBe(1000);
    });

    it('should sum to containerWidth when some hidden', () => {
      const visibility: PanelVisibility = {
        left: true,
        center: false,
        right: true,
        callGraph: false,
      };
      const widths = computePanelWidths([0.1, 0.25, 0.3, 0.35], visibility, 800);
      expect(widths[0] + widths[1] + widths[2] + widths[3]).toBe(800);
    });

    it('should sum 4 widths to containerWidth when all visible', () => {
      const widths = computePanelWidths(DEFAULT_RATIOS, ALL_VISIBLE, 1234);
      expect(widths[0] + widths[1] + widths[2] + widths[3]).toBe(1234);
    });

    it('should redistribute to 3 visible panels when callGraph is hidden', () => {
      const visibility: PanelVisibility = {
        left: true,
        center: true,
        right: true,
        callGraph: false,
      };
      const widths = computePanelWidths(DEFAULT_RATIOS, visibility, 1000);
      expect(widths[3]).toBe(0);
      // left=0.15, center=0.2, right=0.3 — sum=0.65
      expect(widths[0] + widths[1] + widths[2] + widths[3]).toBe(1000);
    });
  });

  describe('computeNewRatios', () => {
    it('should adjust left and center ratios when dragging handle 0 right', () => {
      // drag handle 0 right by 50px in a 1000px container = 0.05 ratio shift
      // left: 0.25+0.05=0.30, center: 0.35-0.05=0.30 — both above MIN (200px)
      const newRatios = computeNewRatios([0.25, 0.35, 0.25, 0.15], 0, 50, 1000);
      expect(newRatios[0]).toBeCloseTo(0.30);
      expect(newRatios[1]).toBeCloseTo(0.30);
      expect(newRatios[2]).toBeCloseTo(0.25);  // right unchanged
      expect(newRatios[3]).toBeCloseTo(0.15);  // callGraph unchanged
    });

    it('should adjust center and right ratios when dragging handle 1 left', () => {
      // drag handle 1 left by 50px: center 0.35-0.05=0.30, right 0.25+0.05=0.30 — no clamping
      const newRatios = computeNewRatios([0.25, 0.35, 0.25, 0.15], 1, -50, 1000);
      expect(newRatios[0]).toBeCloseTo(0.25);  // left unchanged
      expect(newRatios[1]).toBeCloseTo(0.30);
      expect(newRatios[2]).toBeCloseTo(0.30);
      expect(newRatios[3]).toBeCloseTo(0.15);  // callGraph unchanged
    });

    it('should adjust right and callGraph ratios when dragging handle 2 right', () => {
      const newRatios = computeNewRatios([0.15, 0.2, 0.3, 0.35], 2, 100, 1000);
      expect(newRatios[0]).toBeCloseTo(0.15);  // left unchanged
      expect(newRatios[1]).toBeCloseTo(0.2);   // center unchanged
      expect(newRatios[2]).toBeCloseTo(0.4);
      expect(newRatios[3]).toBeCloseTo(0.25);
    });

    it('should adjust right and callGraph ratios when dragging handle 2 left', () => {
      const newRatios = computeNewRatios([0.15, 0.2, 0.3, 0.35], 2, -50, 1000);
      expect(newRatios[0]).toBeCloseTo(0.15);  // left unchanged
      expect(newRatios[1]).toBeCloseTo(0.2);   // center unchanged
      expect(newRatios[2]).toBeCloseTo(0.25);
      expect(newRatios[3]).toBeCloseTo(0.4);
    });

    it('should enforce MIN_PANEL_WIDTH on the left panel', () => {
      // left is 250px (0.25 * 1000), drag handle 0 left by 100px would shrink left to 150px
      // clamping kicks in and keeps left at MIN (200px)
      const newRatios = computeNewRatios([0.25, 0.35, 0.25, 0.15], 0, -100, 1000);
      expect(newRatios[0] * 1000).toBeGreaterThanOrEqual(MIN_PANEL_WIDTH);
    });

    it('should enforce MIN_PANEL_WIDTH on adjacent panel', () => {
      // center is 350px (0.35 * 1000), drag handle 0 right by 200px shrinks center to 150px
      // clamping keeps center at MIN (200px)
      const newRatios = computeNewRatios([0.25, 0.35, 0.25, 0.15], 0, 200, 1000);
      expect(newRatios[1] * 1000).toBeGreaterThanOrEqual(MIN_PANEL_WIDTH);
    });

    it('should not change ratios sum (always 1.0)', () => {
      const newRatios = computeNewRatios([0.15, 0.2, 0.3, 0.35], 0, 50, 1000);
      const sum = newRatios[0] + newRatios[1] + newRatios[2] + newRatios[3];
      expect(sum).toBeCloseTo(1.0);
    });

    it('should not change sum when dragging handle 2', () => {
      const newRatios = computeNewRatios([0.15, 0.2, 0.3, 0.35], 2, 50, 1000);
      const sum = newRatios[0] + newRatios[1] + newRatios[2] + newRatios[3];
      expect(sum).toBeCloseTo(1.0);
    });

    it('should handle zero delta', () => {
      const newRatios = computeNewRatios([0.15, 0.2, 0.3, 0.35], 0, 0, 1000);
      expect(newRatios[0]).toBeCloseTo(0.15);
      expect(newRatios[1]).toBeCloseTo(0.2);
      expect(newRatios[2]).toBeCloseTo(0.3);
      expect(newRatios[3]).toBeCloseTo(0.35);
    });
  });

  describe('togglePanelVisibility', () => {
    it('should hide a visible panel', () => {
      const result = togglePanelVisibility(ALL_VISIBLE, 'left');
      expect(result.left).toBe(false);
      expect(result.center).toBe(true);
      expect(result.right).toBe(true);
      expect(result.callGraph).toBe(true);
    });

    it('should show a hidden panel', () => {
      const current: PanelVisibility = {
        left: false,
        center: true,
        right: true,
        callGraph: true,
      };
      const result = togglePanelVisibility(current, 'left');
      expect(result.left).toBe(true);
    });

    it('should not hide the last visible panel', () => {
      const current: PanelVisibility = {
        left: false,
        center: true,
        right: false,
        callGraph: false,
      };
      const result = togglePanelVisibility(current, 'center');
      expect(result.center).toBe(true);
      expect(result).toEqual(current);
    });

    it('should allow hiding when two panels remain', () => {
      const current: PanelVisibility = {
        left: true,
        center: false,
        right: false,
        callGraph: true,
      };
      const result = togglePanelVisibility(current, 'left');
      expect(result.left).toBe(false);
      expect(result.callGraph).toBe(true);
    });

    it('should not mutate original object', () => {
      const original: PanelVisibility = {
        left: true,
        center: true,
        right: true,
        callGraph: true,
      };
      const result = togglePanelVisibility(original, 'left');
      expect(original.left).toBe(true);  // original unchanged
      expect(result.left).toBe(false);
    });

    it('should hide callGraph panel when others remain visible', () => {
      const result = togglePanelVisibility(ALL_VISIBLE, 'callGraph');
      expect(result.callGraph).toBe(false);
      expect(result.left).toBe(true);
      expect(result.center).toBe(true);
      expect(result.right).toBe(true);
    });

    it('should show callGraph panel when currently hidden', () => {
      const current: PanelVisibility = {
        left: true,
        center: true,
        right: true,
        callGraph: false,
      };
      const result = togglePanelVisibility(current, 'callGraph');
      expect(result.callGraph).toBe(true);
    });

    it('should not hide callGraph when it is the last visible panel', () => {
      const current: PanelVisibility = {
        left: false,
        center: false,
        right: false,
        callGraph: true,
      };
      const result = togglePanelVisibility(current, 'callGraph');
      expect(result.callGraph).toBe(true);
      expect(result).toEqual(current);
    });
  });

  describe('visiblePanelCount', () => {
    it('should return 4 when all visible', () => {
      expect(visiblePanelCount(ALL_VISIBLE)).toBe(4);
    });

    it('should return 3 when callGraph hidden', () => {
      expect(
        visiblePanelCount({
          left: true,
          center: true,
          right: true,
          callGraph: false,
        }),
      ).toBe(3);
    });

    it('should return 1 when only one visible', () => {
      expect(
        visiblePanelCount({
          left: false,
          center: true,
          right: false,
          callGraph: false,
        }),
      ).toBe(1);
    });

    it('should return 0 when none visible', () => {
      expect(
        visiblePanelCount({
          left: false,
          center: false,
          right: false,
          callGraph: false,
        }),
      ).toBe(0);
    });
  });
});
