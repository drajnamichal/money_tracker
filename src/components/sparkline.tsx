'use client';

interface SparklineProps {
  /** Array of numeric values to plot */
  data: number[];
  /** SVG width (default 48) */
  width?: number;
  /** SVG height (default 16) */
  height?: number;
  /** Stroke color (default current text color) */
  color?: string;
}

/**
 * Tiny inline SVG sparkline. No dependencies — pure SVG path.
 * Shows the last N data points as a smooth line.
 */
export function Sparkline({
  data,
  width = 48,
  height = 16,
  color = 'currentColor',
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
    const y =
      height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
      aria-hidden="true"
    >
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.6}
      />
    </svg>
  );
}
