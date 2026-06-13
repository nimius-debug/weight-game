/**
 * A tiny dependency-free SVG sparkline of a weight trend. Renders nothing
 * useful for fewer than two points (shows a flat baseline instead).
 */
export function Sparkline({
  values,
  width = 280,
  height = 56,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) {
    return (
      <div className="flex h-14 items-center justify-center text-xs text-slate-400">
        Log a few more days to see your trend.
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 4;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    // Lower weight should sit higher on the chart (good = up).
    const y = pad + ((v - min) / span) * (height - pad * 2);
    return [x, height - y] as const;
  });

  const path = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  const trendingDown = values[values.length - 1] <= values[0];
  const stroke = trendingDown ? "#10b981" : "#ef4444";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-14 w-full"
      role="img"
      aria-label="Weight trend"
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.map(([x, y]) => `${x},${y}`).join(" ")}
      />
      <path d={path} fill="none" stroke="transparent" />
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1][0]}
          cy={points[points.length - 1][1]}
          r={3}
          fill={stroke}
        />
      )}
    </svg>
  );
}
