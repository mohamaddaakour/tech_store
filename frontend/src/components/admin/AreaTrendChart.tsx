interface TrendPoint {
  date: string;
  revenue: number;
}

interface AreaTrendChartProps {
  data: TrendPoint[];
}

const WIDTH = 600;
const HEIGHT = 220;
const PAD_LEFT = 40;
const PAD_RIGHT = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

export function AreaTrendChart({ data }: AreaTrendChartProps) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-ink-muted">No revenue yet.</p>;
  }

  const maxRevenue = Math.max(1, ...data.map((point) => point.revenue));
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const points = data.map((point, index) => {
    const x = PAD_LEFT + (index / Math.max(1, data.length - 1)) * plotWidth;
    const y = PAD_TOP + plotHeight - (point.revenue / maxRevenue) * plotHeight;
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L${points[points.length - 1].x},${PAD_TOP + plotHeight} L${points[0].x},${PAD_TOP + plotHeight} Z`;

  const yTicks = [0, 0.5, 1].map((fraction) => ({
    value: Math.round(maxRevenue * fraction),
    y: PAD_TOP + plotHeight - fraction * plotHeight,
  }));

  const labelEvery = Math.max(1, Math.floor(data.length / 6));

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.45} />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
        </linearGradient>
      </defs>

      {yTicks.map((tick) => (
        <g key={tick.value}>
          <line
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={tick.y}
            y2={tick.y}
            stroke="var(--color-line)"
          />
          <text x={0} y={tick.y + 3} fontSize={9} fill="var(--color-ink-faint)">
            ${tick.value}
          </text>
        </g>
      ))}

      <path d={areaPath} fill="url(#revenueFill)" />
      <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth={2} />

      {data.map((point, index) =>
        index % labelEvery === 0 ? (
          <text
            key={point.date}
            x={points[index].x}
            y={HEIGHT - 4}
            fontSize={9}
            textAnchor="middle"
            fill="var(--color-ink-faint)"
          >
            {point.date}
          </text>
        ) : null,
      )}
    </svg>
  );
}
