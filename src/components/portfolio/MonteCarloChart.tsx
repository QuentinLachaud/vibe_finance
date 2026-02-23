import { useState, useMemo, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  Label,
  Line,
  ComposedChart,
} from 'recharts';
import { formatCurrency } from '../../utils/currency';
import type { TimeStep, SimulationResult } from '../../utils/simulationEngine';
import type { CurrencyCode } from '../../types';

interface MonteCarloChartProps {
  data: TimeStep[];
  result: SimulationResult;
  currencyCode: CurrencyCode;
  showAllPaths?: 'quartiles' | 'all' | 'both';
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

/** Build histogram bins from the final distribution. */
function buildHistogram(values: number[], numBins: number = 30) {
  if (!values.length) return [];
  const min = values[0];
  const max = values[values.length - 1];
  if (min === max) return [{ binStart: min, binEnd: max, count: values.length, label: '' }];

  const binSize = (max - min) / numBins;
  const bins: { binStart: number; binEnd: number; count: number; label: string }[] = [];

  for (let i = 0; i < numBins; i++) {
    const binStart = min + i * binSize;
    const binEnd = binStart + binSize;
    bins.push({ binStart, binEnd, count: 0, label: '' });
  }

  for (const v of values) {
    let idx = Math.floor((v - min) / binSize);
    if (idx >= numBins) idx = numBins - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  }

  // Create labels for bins
  for (const bin of bins) {
    const mid = (bin.binStart + bin.binEnd) / 2;
    if (mid >= 1_000_000) bin.label = `${(mid / 1_000_000).toFixed(1)}M`;
    else if (mid >= 1_000) bin.label = `${(mid / 1_000).toFixed(0)}K`;
    else bin.label = String(Math.round(mid));
  }

  return bins;
}

function pctile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Distribution bar chart (back face of the flip card). */
function DistributionView({
  distribution,
  currencyCode,
  hoveredLabel,
}: {
  distribution: number[];
  currencyCode: CurrencyCode;
  hoveredLabel: string;
}) {
  const bins = useMemo(() => buildHistogram(distribution, 30), [distribution]);
  const p25 = useMemo(() => pctile(distribution, 25), [distribution]);
  const median = useMemo(() => pctile(distribution, 50), [distribution]);
  const p75 = useMemo(() => pctile(distribution, 75), [distribution]);

  if (!bins.length) return null;

  return (
    <div className="ps-dist-view">
      <div className="ps-dist-header">
        <h3 className="ps-dist-title">Outcome Distribution — {hoveredLabel || 'End of Horizon'}</h3>
        <p className="ps-dist-subtitle">
          Each bar shows how many simulations landed in that value range.
          Highlighted regions mark the key percentiles.
        </p>
      </div>

      <div className="ps-dist-stats">
        <div className="ps-dist-stat">
          <span className="ps-dist-stat-label" style={{ color: '#eab308' }}>25th (Pessimistic)</span>
          <span className="ps-dist-stat-value">{formatCurrency(Math.round(p25), currencyCode)}</span>
        </div>
        <div className="ps-dist-stat">
          <span className="ps-dist-stat-label" style={{ color: COLOR_MEDIAN }}>Median (Expected)</span>
          <span className="ps-dist-stat-value">{formatCurrency(Math.round(median), currencyCode)}</span>
        </div>
        <div className="ps-dist-stat">
          <span className="ps-dist-stat-label" style={{ color: COLOR_INNER }}>75th (Optimistic)</span>
          <span className="ps-dist-stat-value">{formatCurrency(Math.round(p75), currencyCode)}</span>
        </div>
      </div>

      <div className="ps-chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={bins} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              axisLine={{ stroke: 'var(--border-color)' }}
              tickLine={false}
              interval={Math.max(0, Math.floor(bins.length / 6) - 1)}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]} animationDuration={400}>
              {bins.map((bin, idx) => {
                const mid = (bin.binStart + bin.binEnd) / 2;
                let fill = 'rgba(139, 92, 246, 0.5)'; // outer / default violet
                if (mid >= p25 && mid <= p75) fill = 'rgba(16, 185, 129, 0.6)'; // inner emerald
                return <Cell key={idx} fill={fill} />;
              })}
            </Bar>
            <ReferenceLine x={bins.find(b => (b.binStart + b.binEnd) / 2 >= median)?.label} stroke={COLOR_MEDIAN} strokeWidth={2} strokeDasharray="4 4">
              <Label value="Median" position="top" fill={COLOR_MEDIAN} fontSize={11} />
            </ReferenceLine>
            <ReferenceLine x={bins.find(b => (b.binStart + b.binEnd) / 2 >= p25)?.label} stroke="#eab308" strokeWidth={1.5} strokeDasharray="4 4">
              <Label value="25th" position="top" fill="#eab308" fontSize={10} />
            </ReferenceLine>
            <ReferenceLine x={bins.find(b => (b.binStart + b.binEnd) / 2 >= p75)?.label} stroke={COLOR_INNER} strokeWidth={1.5} strokeDasharray="4 4">
              <Label value="75th" position="top" fill={COLOR_INNER} fontSize={10} />
            </ReferenceLine>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function MonteCarloChart({ data, result, currencyCode, showAllPaths = 'quartiles' }: MonteCarloChartProps) {
  const [flipped, setFlipped] = useState(false);
  const [hoveredLabel, setHoveredLabel] = useState('');

  // Pre-compute stacked band data for correct layering
  const chartData = useMemo(() => {
    const allPaths = result.allPaths;
    return data.map((d, i) => {
      const row: Record<string, any> = {
        ...d,
        p10_base: d.p10,
        band_10_25: Math.max(0, d.p25 - d.p10),
        band_25_75: Math.max(0, d.p75 - d.p25),
        band_75_90: Math.max(0, d.p90 - d.p75),
      };
      const wantPaths = showAllPaths === 'all' || showAllPaths === 'both';
      if (wantPaths && allPaths) {
        for (let p = 0; p < allPaths.length; p++) {
          row[`path_${p}`] = allPaths[p]?.[i] ?? null;
        }
      }
      return row;
    });
  }, [data, result.allPaths, showAllPaths]);

  const wantPaths = showAllPaths === 'all' || showAllPaths === 'both';
  const wantBands = showAllPaths === 'quartiles' || showAllPaths === 'both';
  const pathCount = wantPaths && result.allPaths ? result.allPaths.length : 0;

  const handleMouseMove = useCallback((state: any) => {
    if (state?.activeLabel) {
      setHoveredLabel(state.activeLabel);
    }
  }, []);

  if (!data.length) return null;

  return (
    <div className={`ps-flip-container ${flipped ? 'ps-flip-container--flipped' : ''}`}>
      {/* Front face — Monte Carlo chart */}
      <div className="ps-flip-face ps-flip-face--front">
        <div className="ps-flip-header">
          <h2 className="ps-card-title">Monte Carlo Simulation</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`ps-survival-badge ps-survival-badge--chart ${
              result.survivalRate >= 95 ? 'ps-survival-badge--green' :
              result.survivalRate >= 80 ? 'ps-survival-badge--yellow' :
              'ps-survival-badge--red'
            }`}>
              {result.survivalRate.toFixed(0)}% survive
            </span>
            <button className="ps-flip-btn" onClick={() => setFlipped(true)} title="Show outcome distribution">
              📊 Distribution
            </button>
          </div>
        </div>
        <div className="ps-chart-container">
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              onMouseMove={handleMouseMove}
            >
              <defs>
                <linearGradient id="outerBandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR_OUTER} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={COLOR_OUTER} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="innerBandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR_INNER} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={COLOR_INNER} stopOpacity={0.08} />
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
                cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1 }}
              />

              {/* Individual simulation paths (behind bands) */}
              {wantPaths && Array.from({ length: pathCount }, (_, p) => (
                <Line
                  key={`path_${p}`}
                  dataKey={`path_${p}`}
                  stroke="rgba(139, 92, 246, 0.08)"
                  strokeWidth={0.5}
                  dot={false}
                  legendType="none"
                  isAnimationActive={false}
                  connectNulls
                />
              ))}

              {/* Invisible base up to p10 */}
              {wantBands && (
                <Area
                  dataKey="p10_base"
                  stackId="bands"
                  stroke="none"
                  fill="transparent"
                  legendType="none"
                  animationDuration={600}
                />
              )}

              {/* P10–P25: outer band (lower) — violet */}
              {wantBands && (
                <Area
                  dataKey="band_10_25"
                  stackId="bands"
                  stroke="none"
                  fill="url(#outerBandGrad)"
                  name="10th–90th"
                  animationDuration={600}
                />
              )}

              {/* P25–P75: inner band — emerald */}
              {wantBands && (
                <Area
                  dataKey="band_25_75"
                  stackId="bands"
                  stroke="none"
                  fill="url(#innerBandGrad)"
                  name="25th–75th"
                  animationDuration={600}
                />
              )}

              {/* P75–P90: outer band (upper) — violet */}
              {wantBands && (
                <Area
                  dataKey="band_75_90"
                  stackId="bands"
                  stroke="none"
                  fill="url(#outerBandGrad)"
                  legendType="none"
                  animationDuration={600}
                />
              )}

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
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Back face — Distribution chart */}
      <div className="ps-flip-face ps-flip-face--back">
        <div className="ps-flip-header">
          <button className="ps-flip-btn" onClick={() => setFlipped(false)} title="Show Monte Carlo chart">
            📈 Monte Carlo
          </button>
        </div>
        <DistributionView
          distribution={result.finalDistribution}
          currencyCode={currencyCode}
          hoveredLabel={hoveredLabel}
        />
      </div>
    </div>
  );
}
