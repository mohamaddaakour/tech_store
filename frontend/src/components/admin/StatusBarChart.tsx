interface StatusBarDatum {
  name: string;
  count: number;
  status: string;
}

interface StatusBarChartProps {
  data: StatusBarDatum[];
  colors: Record<string, string>;
}

const WIDTH = 400;
const HEIGHT = 200;
const PAD_LEFT = 28;
const PAD_RIGHT = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

export function StatusBarChart({ data, colors }: StatusBarChartProps) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-ink-muted">No orders yet.</p>;
  }

  const maxCount = Math.max(1, ...data.map((entry) => entry.count));
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const barSlot = plotWidth / data.length;
  const barWidth = barSlot * 0.55;

  const yTicks = [0, 0.5, 1].map((fraction) => ({
    value: Math.round(maxCount * fraction),
    y: PAD_TOP + plotHeight - fraction * plotHeight,
  }));

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-full w-full" preserveAspectRatio="none">
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
            {tick.value}
          </text>
        </g>
      ))}

      {data.map((entry, index) => {
        const barHeight = (entry.count / maxCount) * plotHeight;
        const x = PAD_LEFT + index * barSlot + (barSlot - barWidth) / 2;
        const y = PAD_TOP + plotHeight - barHeight;
        return (
          <g key={entry.status}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill={colors[entry.status] ?? "var(--color-accent)"}
            />
            <text
              x={x + barWidth / 2}
              y={HEIGHT - 4}
              fontSize={9}
              textAnchor="middle"
              fill="var(--color-ink-faint)"
            >
              {entry.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
