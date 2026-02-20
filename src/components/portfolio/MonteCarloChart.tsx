import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { formatCurrency } from '../../utils/currency';
import type { TimeStep } from '../../utils/simulationEngine';
import type { CurrencyCode } from '../../types';

interface MonteCarloChartProps {
  data: TimeStep[];
  currencyCode: CurrencyCode;
}

// ── Distinct color palette for high contrast ──
const COLOR_OUTER = '#8b5cf6'; // violet for 10th–90th
const COLOR_INNER = '#10b981'; // emerald for 25th–75th
const COLOR_MEDIAN = '#22d3ee'; // cyan for median

function ChartTooltip({ active, payload, label, currencyCode }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="ps-tooltip">
      <p className="ps-tooltip-title">{label}</p>
      <p className="ps-tooltip-row ps-tooltip-row--p90">
        <span className="ps-tooltip-swatch" style={{ background: COLOR_OUTER }} />
        90th: {formatCurrency(point.p90, currencyCode)}
      </p>
      <p className="ps-tooltip-row ps-tooltip-row--p75">
        <span className="ps-tooltip-swatch" style={{ background: COLOR_INNER }} />
        75th: {formatCurrency(point.p75, currencyCode)}
      </p>
      <p className="ps-tooltip-row ps-tooltip-row--median">
        <span className="ps-tooltip-swatch" style={{ background: COLOR_MEDIAN }} />
        Median: {formatCurrency(point.median, currencyCode)}
      </p>
      <p className="ps-tooltip-row ps-tooltip-row--p25">
        <span className="ps-tooltip-swatch" style={{ background: COLOR_INNER }} />
        25th: {formatCurrency(point.p25, currencyCode)}
      </p>
      <p className="ps-tooltip-row ps-tooltip-row--p10">
        <span className="ps-tooltip-swatch" style={{ background: COLOR_OUTER }} />
        10th: {formatCurrency(point.p10, currencyCode)}
      </p>
    </div>
  );
}

export function MonteCarloChart({ data, currencyCode }: MonteCarloChartProps) {
  if (!data.length) return null;

  // Pre-compute stacked band data for correct layering
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        p10_base: d.p10,
        band_10_25: Math.max(0, d.p25 - d.p10),
        band_25_75: Math.max(0, d.p75 - d.p25),
        band_75_90: Math.max(0, d.p90 - d.p75),
      })),
    [data],
  );

  return (
    <div className="ps-chart-container">
      <ResponsiveContainer width="100%" height={380}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="outerBandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLOR_OUTER} stopOpacity={0.4} />
              <stop offset="100%" stopColor={COLOR_OUTER} stopOpacity={0.08} />
            </linearGradient>
            <linearGradient id="innerBandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLOR_INNER} stopOpacity={0.5} />
              <stop offset="100%" stopColor={COLOR_INNER} stopOpacity={0.12} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border-color)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />

          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => {
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
              if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
              return String(v);
            }}
          />

          <Tooltip
            content={<ChartTooltip currencyCode={currencyCode} />}
            cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
          />

          {/* Invisible base up to p10 */}
          <Area
            dataKey="p10_base"
            stackId="bands"
            stroke="none"
            fill="transparent"
            legendType="none"
            animationDuration={600}
          />

          {/* P10–P25: outer band (lower) — violet */}
          <Area
            dataKey="band_10_25"
            stackId="bands"
            stroke="none"
            fill="url(#outerBandGrad)"
            name="10th–90th"
            animationDuration={600}
          />

          {/* P25–P75: inner band — emerald */}
          <Area
            dataKey="band_25_75"
            stackId="bands"
            stroke="none"
            fill="url(#innerBandGrad)"
            name="25th–75th"
            animationDuration={600}
          />

          {/* P75–P90: outer band (upper) — violet */}
          <Area
            dataKey="band_75_90"
            stackId="bands"
            stroke="none"
            fill="url(#outerBandGrad)"
            legendType="none"
            animationDuration={600}
          />

          {/* Median line — bright cyan */}
          <Area
            dataKey="median"
            stroke={COLOR_MEDIAN}
            strokeWidth={2.5}
            fill="none"
            name="Median"
            dot={false}
            animationDuration={800}
          />

          <Legend
            wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
