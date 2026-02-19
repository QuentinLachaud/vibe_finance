// TODO: Replace with AppComponentLibrary chart component if one becomes available

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string;
  size?: number;
}

export function DonutChart({
  segments,
  centerLabel,
  centerValue,
  size = 220,
}: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) {
    return (
      <div
        className="donut-chart"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 100 100" className="donut-svg">
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="var(--color-surface-alt, #1e293b)"
            strokeWidth="14"
          />
        </svg>
        {centerLabel && (
          <div className="donut-center">
            <span className="donut-center-value">{centerValue}</span>
            <span className="donut-center-label">{centerLabel}</span>
          </div>
        )}
      </div>
    );
  }

  // Build arc segments
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  const arcs = segments
    .filter((seg) => seg.value > 0)
    .map((seg) => {
      const pct = seg.value / total;
      const dashLength = pct * circumference;
      const dashGap = circumference - dashLength;
      const offset = -cumulativeOffset + circumference * 0.25; // start at top
      cumulativeOffset += dashLength;

      return {
        ...seg,
        dashArray: `${dashLength} ${dashGap}`,
        dashOffset: offset,
      };
    });

  return (
    <div className="donut-chart" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="donut-svg">
        {arcs.map((arc) => (
          <circle
            key={arc.label}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth="14"
            strokeDasharray={arc.dashArray}
            strokeDashoffset={arc.dashOffset}
            strokeLinecap="butt"
            className="donut-segment"
          />
        ))}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="donut-center">
          <span className="donut-center-value">{centerValue}</span>
          <span className="donut-center-label">{centerLabel}</span>
        </div>
      )}
    </div>
  );
}

interface DonutLegendProps {
  items: { label: string; value: string; color: string }[];
}

export function DonutLegend({ items }: DonutLegendProps) {
  return (
    <div className="donut-legend">
      {items.map((item) => (
        <div key={item.label} className="legend-item">
          <span
            className="legend-swatch"
            style={{ backgroundColor: item.color }}
          />
          <span className="legend-value">{item.value}</span>
          <span className="legend-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
