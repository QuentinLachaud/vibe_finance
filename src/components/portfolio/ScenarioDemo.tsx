import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

// ── Chart colours (matches MonteCarloChart) ──
const COLOR_OUTER = '#8b5cf6';
const COLOR_INNER = '#10b981';
const COLOR_MEDIAN = '#22d3ee';

// ── Hardcoded demo datasets ──

/** Deposit-only trajectory: steady upward growth */
const DEPOSIT_ONLY = [
  { label: 'Now', p10: 0, p25: 0, median: 0, p75: 0, p90: 0 },
  { label: '2027', p10: 8_000, p25: 11_000, median: 14_000, p75: 18_000, p90: 23_000 },
  { label: '2029', p10: 22_000, p25: 32_000, median: 42_000, p75: 56_000, p90: 74_000 },
  { label: '2031', p10: 40_000, p25: 60_000, median: 82_000, p75: 112_000, p90: 150_000 },
  { label: '2033', p10: 62_000, p25: 96_000, median: 135_000, p75: 186_000, p90: 256_000 },
  { label: '2035', p10: 90_000, p25: 140_000, median: 200_000, p75: 290_000, p90: 400_000 },
  { label: '2037', p10: 120_000, p25: 195_000, median: 285_000, p75: 420_000, p90: 590_000 },
  { label: '2040', p10: 180_000, p25: 290_000, median: 430_000, p75: 650_000, p90: 920_000 },
];

/** Deposit + retirement drawdown: rises then declines */
const WITH_DRAWDOWN = [
  { label: 'Now', p10: 0, p25: 0, median: 0, p75: 0, p90: 0 },
  { label: '2027', p10: 8_000, p25: 11_000, median: 14_000, p75: 18_000, p90: 23_000 },
  { label: '2029', p10: 22_000, p25: 32_000, median: 42_000, p75: 56_000, p90: 74_000 },
  { label: '2031', p10: 40_000, p25: 60_000, median: 82_000, p75: 112_000, p90: 150_000 },
  { label: '2033', p10: 55_000, p25: 88_000, median: 125_000, p75: 175_000, p90: 240_000 },
  { label: '2035', p10: 30_000, p25: 65_000, median: 105_000, p75: 175_000, p90: 265_000 },
  { label: '2037', p10: 0, p25: 22_000, median: 62_000, p75: 125_000, p90: 215_000 },
  { label: '2040', p10: 0, p25: 0, median: 20_000, p75: 72_000, p90: 160_000 },
];

// ── Component ──

interface ScenarioDemoProps {
  onGetStarted: () => void;
}

/**
 * Animated onboarding shown when user has no cash flows yet.
 *
 * Sequence:
 *   1. Deposit card slides in
 *   2. Monte Carlo chart fades in (deposit-only curve)
 *   3. Drawdown card slides in → chart transitions to show drawdown
 *   4. "Get Started" CTA fades in
 */
export function ScenarioDemo({ onGetStarted }: ScenarioDemoProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),   // deposit card
      setTimeout(() => setPhase(2), 1600),   // chart appears (deposit only)
      setTimeout(() => setPhase(3), 3600),   // drawdown card + chart transitions
      setTimeout(() => setPhase(4), 5400),   // CTA button
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const rawData = phase >= 3 ? WITH_DRAWDOWN : DEPOSIT_ONLY;

  const chartData = useMemo(
    () =>
      rawData.map((d) => ({
        ...d,
        p10_base: d.p10,
        band_10_25: Math.max(0, d.p25 - d.p10),
        band_25_75: Math.max(0, d.p75 - d.p25),
        band_75_90: Math.max(0, d.p90 - d.p75),
      })),
    [rawData],
  );

  return (
    <div className="ps-demo">
      <h2 className="ps-demo-headline">See the future of your finances</h2>
      <p className="ps-demo-subhead">
        Add deposits and withdrawals, then watch a Monte&nbsp;Carlo simulation
        play&nbsp;out thousands of scenarios.
      </p>

      {/* ── Animated cards ── */}
      <div className="ps-demo-cards">
        <div
          className={`ps-demo-card ps-demo-card--deposit ${phase >= 1 ? 'ps-demo-card--visible' : ''}`}
        >
          <span className="ps-demo-card-icon">📥</span>
          <div>
            <div className="ps-demo-card-title">Monthly Savings</div>
            <div className="ps-demo-card-amount">£500 / month</div>
          </div>
        </div>

        <div
          className={`ps-demo-card ps-demo-card--withdrawal ${phase >= 3 ? 'ps-demo-card--visible' : ''}`}
        >
          <span className="ps-demo-card-icon">📤</span>
          <div>
            <div className="ps-demo-card-title">Retirement Drawdown</div>
            <div className="ps-demo-card-amount">£2,000 / month</div>
          </div>
        </div>
      </div>

      {/* ── Animated chart ── */}
      <div className={`ps-demo-chart ${phase >= 2 ? 'ps-demo-chart--visible' : ''}`}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="demoOuterGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR_OUTER} stopOpacity={0.35} />
                <stop offset="100%" stopColor={COLOR_OUTER} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="demoInnerGrad" x1="0" y1="0" x2="0" y2="1">
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
            />

            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) =>
                v >= 1_000_000
                  ? `${(v / 1_000_000).toFixed(1)}M`
                  : v >= 1_000
                    ? `${(v / 1_000).toFixed(0)}K`
                    : String(v)
              }
            />

            {/* Invisible base up to p10 */}
            <Area
              dataKey="p10_base"
              stackId="bands"
              stroke="none"
              fill="transparent"
              animationDuration={1200}
            />

            {/* P10–P25 outer band */}
            <Area
              dataKey="band_10_25"
              stackId="bands"
              stroke="none"
              fill="url(#demoOuterGrad)"
              animationDuration={1200}
            />

            {/* P25–P75 inner band */}
            <Area
              dataKey="band_25_75"
              stackId="bands"
              stroke="none"
              fill="url(#demoInnerGrad)"
              animationDuration={1200}
            />

            {/* P75–P90 outer band */}
            <Area
              dataKey="band_75_90"
              stackId="bands"
              stroke="none"
              fill="url(#demoOuterGrad)"
              animationDuration={1200}
            />

            {/* Median line */}
            <Area
              dataKey="median"
              stroke={COLOR_MEDIAN}
              strokeWidth={2.5}
              fill="none"
              dot={false}
              animationDuration={1200}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── CTA ── */}
      <div className={`ps-demo-cta ${phase >= 4 ? 'ps-demo-cta--visible' : ''}`}>
        <button className="ps-btn ps-btn--gold ps-demo-start-btn" onClick={onGetStarted}>
          Get Started with Scenarios
        </button>
      </div>
    </div>
  );
}
