/** Shared chart color palette used across expenses and portfolio charts */
export const CHART_COLORS = [
  '#2563eb', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#a855f7', // purple
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#d946ef', // fuchsia
] as const;

/**
 * Theme-aware Recharts Tooltip style.
 * Uses CSS variables so it works in both light and dark mode.
 */
export const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: 'hsl(var(--card))',
  color: 'hsl(var(--card-foreground))',
  borderRadius: '12px',
  border: '1px solid hsl(var(--border))',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
};
