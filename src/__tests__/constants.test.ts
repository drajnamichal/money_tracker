import { CHART_COLORS, TOOLTIP_STYLE } from '../lib/constants';

describe('CHART_COLORS', () => {
  it('has at least 10 colors for sufficient chart variety', () => {
    expect(CHART_COLORS.length).toBeGreaterThanOrEqual(10);
  });

  it('contains only valid hex color codes', () => {
    CHART_COLORS.forEach((color) => {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it('has no duplicate colors', () => {
    const unique = new Set(CHART_COLORS);
    expect(unique.size).toBe(CHART_COLORS.length);
  });
});

describe('TOOLTIP_STYLE', () => {
  it('uses CSS variables for backgroundColor (dark mode compatible)', () => {
    expect(TOOLTIP_STYLE.backgroundColor).toContain('var(--');
  });

  it('uses CSS variables for color', () => {
    expect(TOOLTIP_STYLE.color).toContain('var(--');
  });

  it('uses CSS variables for border', () => {
    expect(TOOLTIP_STYLE.border).toContain('var(--');
  });

  it('has borderRadius set', () => {
    expect(TOOLTIP_STYLE.borderRadius).toBeDefined();
  });

  it('has boxShadow set', () => {
    expect(TOOLTIP_STYLE.boxShadow).toBeDefined();
  });

  it('does not contain hardcoded #fff', () => {
    const values = Object.values(TOOLTIP_STYLE).join(' ');
    expect(values).not.toContain('#fff');
    expect(values).not.toContain('white');
  });
});
