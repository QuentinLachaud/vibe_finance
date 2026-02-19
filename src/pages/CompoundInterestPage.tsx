import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useCurrency } from '../state/CurrencyContext';
import { formatCurrency } from '../utils/currency';
import {
  calculateCompoundInterest,
  type CompoundInterestInputs,
  type CompoundInterestResult,
} from '../utils/compoundInterest';

// ── Chart colors matching the design system ──
const COLOR_DEPOSITS = '#7c3aed'; // purple/indigo for deposits (darker blue-purple)
const COLOR_INTEREST = '#f59e0b'; // amber/orange for interest earned

// ── Deposit Increase Options ──
const DEPOSIT_INCREASE_OPTIONS = [0, 1, 2, 3, 4, 5];

// ── Custom Tooltip ──
function ChartTooltip({ active, payload, label, currencyCode }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ci-tooltip">
      <p className="ci-tooltip-title">Year {label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="ci-tooltip-row">
          <span
            className="ci-tooltip-swatch"
            style={{ background: entry.color }}
          />
          {entry.name}: {formatCurrency(entry.value, currencyCode)}
        </p>
      ))}
    </div>
  );
}

// ── Currency Input Wrapper ──
function CurrencyInput({
  value,
  onChange,
  symbol,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  symbol: string;
  ariaLabel: string;
}) {
  const [raw, setRaw] = useState(value.toLocaleString('en-GB'));

  useEffect(() => {
    setRaw(value.toLocaleString('en-GB'));
  }, [value]);

  const handleBlur = () => {
    const parsed = Number(raw.replace(/,/g, ''));
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    } else {
      setRaw(value.toLocaleString('en-GB'));
    }
  };

  return (
    <div className="ci-currency-input">
      <span className="ci-currency-prefix">{symbol}</span>
      <input
        type="text"
        inputMode="numeric"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={handleBlur}
        aria-label={ariaLabel}
      />
    </div>
  );
}

// ── Numeric Input ──
function NumericInput({
  value,
  onChange,
  suffix,
  ariaLabel,
  min = 0,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  ariaLabel: string;
  min?: number;
  max?: number;
}) {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  const handleBlur = () => {
    let parsed = Number(raw);
    if (isNaN(parsed)) {
      setRaw(String(value));
      return;
    }
    if (min !== undefined) parsed = Math.max(min, parsed);
    if (max !== undefined) parsed = Math.min(max, parsed);
    onChange(parsed);
  };

  return (
    <div className="ci-numeric-input">
      <input
        type="text"
        inputMode="decimal"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={handleBlur}
        aria-label={ariaLabel}
      />
      {suffix && <span className="ci-numeric-suffix">{suffix}</span>}
    </div>
  );
}

// ── Animated Number ──
function AnimatedValue({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    setDisplay(value);
  }, [value]);

  return <span className={`ci-animated-value ${className ?? ''}`}>{display}</span>;
}

// ── Main Page ──
export function CompoundInterestPage() {
  const { currency } = useCurrency();

  // Inputs
  const [initialInvestment, setInitialInvestment] = useState(10000);
  const [recurringInvestment, setRecurringInvestment] = useState(500);
  const [recurringFrequency, setRecurringFrequency] = useState<'monthly' | 'annually'>('monthly');
  const [annualGrowthRate, setAnnualGrowthRate] = useState(6);
  const [annualDepositIncrease, setAnnualDepositIncrease] = useState(2);
  const [years, setYears] = useState(30);

  // Table state
  const [tableOpen, setTableOpen] = useState(false);
  const [tableView, setTableView] = useState<'annual' | 'monthly'>('annual');

  // Force-recalculate counter (bumped by Calculate button)
  const [calcCounter, setCalcCounter] = useState(0);

  const isValid =
    initialInvestment >= 0 &&
    recurringInvestment >= 0 &&
    annualGrowthRate >= 0 &&
    annualGrowthRate <= 100 &&
    years > 0 &&
    years <= 100;

  // Result recalculates on any input change OR when Calculate is pressed
  const result: CompoundInterestResult | null = useMemo(() => {
    if (!isValid) return null;
    // calcCounter dependency forces recalc even if inputs haven't changed
    void calcCounter;
    return calculateCompoundInterest({
      initialInvestment,
      recurringInvestment,
      recurringFrequency,
      annualGrowthRate,
      annualDepositIncrease,
      years,
    });
  }, [initialInvestment, recurringInvestment, recurringFrequency, annualGrowthRate, annualDepositIncrease, years, isValid, calcCounter]);

  const handleCalculate = useCallback(() => {
    setCalcCounter((c) => c + 1);
  }, []);

  // Chart data — Deposits (purple) stacked under Interest (orange)
  const chartData = useMemo(() => {
    if (!result) return [];
    return result.yearByYear.map((d) => ({
      year: d.year,
      Deposits: d.deposits,
      Interest: d.interest,
    }));
  }, [result]);

  // Table rows — annual or monthly
  const tableRows = useMemo(() => {
    if (!result) return [];
    if (tableView === 'annual') return result.yearByYear;
    return result.monthByMonth;
  }, [result, tableView]);

  return (
    <div className="ci-page">
      {/* ── Page Header ── */}
      <div className="page-header">
        <h1 className="page-title">Compound Interest Calculator</h1>
        <p className="page-subtitle">
          Calculate how your investments grow over time with compounding.
        </p>
      </div>

      <div className="ci-grid">
        {/* ════════ LEFT COLUMN ════════ */}
        <div className="ci-left">
          {/* Input Card */}
          <div className="ci-card">
            <h2 className="ci-card-title">Investment Details</h2>

            {/* Initial Investment */}
            <div className="ci-field">
              <label className="ci-label">Initial Investment</label>
              <CurrencyInput
                value={initialInvestment}
                onChange={setInitialInvestment}
                symbol={currency.symbol}
                ariaLabel="Initial investment amount"
              />
            </div>

            {/* Recurring Investment */}
            <div className="ci-field">
              <label className="ci-label">Recurring Investment</label>
              <div className="ci-row">
                <CurrencyInput
                  value={recurringInvestment}
                  onChange={setRecurringInvestment}
                  symbol={currency.symbol}
                  ariaLabel="Recurring investment amount"
                />
                <div className="ci-toggle">
                  <button
                    className={`ci-toggle-btn ${recurringFrequency === 'monthly' ? 'ci-toggle-btn--active' : ''}`}
                    onClick={() => setRecurringFrequency('monthly')}
                  >
                    Monthly
                  </button>
                  <button
                    className={`ci-toggle-btn ${recurringFrequency === 'annually' ? 'ci-toggle-btn--active' : ''}`}
                    onClick={() => setRecurringFrequency('annually')}
                  >
                    Annually
                  </button>
                </div>
              </div>
            </div>

            {/* Annual Growth Rate */}
            <div className="ci-field">
              <label className="ci-label">Annual Growth Rate</label>
              <NumericInput
                value={annualGrowthRate}
                onChange={setAnnualGrowthRate}
                suffix="%"
                ariaLabel="Annual growth rate percentage"
                min={0}
                max={100}
              />
            </div>

            {/* Increase Annual Deposits */}
            <div className="ci-field">
              <label className="ci-label">Increase Annual Deposits</label>
              <div className="ci-segment-group">
                {DEPOSIT_INCREASE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    className={`ci-segment-btn ${annualDepositIncrease === opt ? 'ci-segment-btn--active' : ''}`}
                    onClick={() => setAnnualDepositIncrease(opt)}
                    aria-label={`${opt}% annual deposit increase`}
                  >
                    {opt}%
                  </button>
                ))}
              </div>
            </div>

            {/* Years */}
            <div className="ci-field">
              <label className="ci-label">Investment Period</label>
              <NumericInput
                value={years}
                onChange={setYears}
                suffix="years"
                ariaLabel="Investment period in years"
                min={1}
                max={100}
              />
            </div>

            {/* Calculate Button */}
            <button
              className="calculate-btn ci-calculate-btn"
              disabled={!isValid}
              onClick={handleCalculate}
              aria-label="Calculate compound interest"
            >
              Calculate
            </button>
          </div>

          {/* ── Result Detail Cards (below left) ── */}
          {result && (
            <div className="ci-detail-cards">
              <div className="ci-detail-card">
                <div className="ci-detail-icon">📈</div>
                <div className="ci-detail-label">Future Value</div>
                <AnimatedValue
                  value={formatCurrency(result.futureValue, currency.code)}
                  className="ci-detail-value--green"
                />
              </div>
              <div className="ci-detail-card">
                <div className="ci-detail-icon">💰</div>
                <div className="ci-detail-label">Total Interest</div>
                <AnimatedValue
                  value={formatCurrency(result.totalInterest, currency.code)}
                  className="ci-detail-value--yellow"
                />
              </div>
              <div className="ci-detail-card">
                <div className="ci-detail-icon">💼</div>
                <div className="ci-detail-label">Total Deposits</div>
                <AnimatedValue
                  value={formatCurrency(result.totalDeposits, currency.code)}
                  className="ci-detail-value--blue"
                />
              </div>
            </div>
          )}
        </div>

        {/* ════════ RIGHT COLUMN ════════ */}
        <div className="ci-right">
          {/* Results Summary Card */}
          {result && (
            <div className="ci-card ci-results-card">
              <h2 className="ci-card-title">Results</h2>
              <div className="ci-results-grid">
                <div className="ci-result-item">
                  <span className="ci-result-label">Future Value</span>
                  <AnimatedValue
                    value={formatCurrency(result.futureValue, currency.code)}
                    className="ci-result-value--green"
                  />
                </div>
                <div className="ci-result-item">
                  <span className="ci-result-label">Total Interest Earned</span>
                  <AnimatedValue
                    value={formatCurrency(result.totalInterest, currency.code)}
                    className="ci-result-value--yellow"
                  />
                </div>
                <div className="ci-result-item">
                  <span className="ci-result-label">Initial Balance</span>
                  <AnimatedValue
                    value={formatCurrency(initialInvestment, currency.code)}
                    className="ci-result-value--blue"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Stacked Bar Chart */}
          {result && chartData.length > 0 && (
            <div className="ci-card ci-chart-card">
              <h2 className="ci-card-title">Portfolio Growth</h2>
              <div className="ci-chart-container">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-color)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                      axisLine={{ stroke: 'var(--border-color)' }}
                      tickLine={false}
                      tickFormatter={(v) => (chartData.length > 20 && v % 5 !== 0 ? '' : `${v}`)}
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
                      content={<ChartTooltip currencyCode={currency.code} />}
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }}
                    />
                    <Bar
                      dataKey="Deposits"
                      stackId="portfolio"
                      fill={COLOR_DEPOSITS}
                      radius={[0, 0, 0, 0]}
                      animationDuration={800}
                    />
                    <Bar
                      dataKey="Interest"
                      stackId="portfolio"
                      fill={COLOR_INTEREST}
                      radius={[4, 4, 0, 0]}
                      animationDuration={800}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Collapsible Year-by-Year / Month-by-Month Table */}
          {result && (
            <div className="ci-card ci-table-card">
              <div className="ci-table-header">
                <button
                  className="ci-table-toggle"
                  onClick={() => setTableOpen((v) => !v)}
                  aria-expanded={tableOpen}
                  aria-label="Toggle breakdown table"
                >
                  <span>Breakdown Table</span>
                  <span className={`ci-table-arrow ${tableOpen ? 'ci-table-arrow--open' : ''}`}>
                    ▼
                  </span>
                </button>

                {tableOpen && (
                  <div className="ci-table-view-toggle">
                    <button
                      className={`ci-toggle-btn ${tableView === 'annual' ? 'ci-toggle-btn--active' : ''}`}
                      onClick={() => setTableView('annual')}
                    >
                      Annual
                    </button>
                    <button
                      className={`ci-toggle-btn ${tableView === 'monthly' ? 'ci-toggle-btn--active' : ''}`}
                      onClick={() => setTableView('monthly')}
                    >
                      Monthly
                    </button>
                  </div>
                )}
              </div>

              <div className={`ci-table-body ${tableOpen ? 'ci-table-body--open' : ''}`}>
                <div className="ci-table-scroll">
                  <table className="ci-table" aria-label="Compound interest breakdown">
                    <thead>
                      <tr>
                        <th className="ci-th ci-th--left">
                          {tableView === 'annual' ? 'Year' : 'Month'}
                        </th>
                        <th className="ci-th ci-th--right">Deposits</th>
                        <th className="ci-th ci-th--right">Interest</th>
                        <th className="ci-th ci-th--right">Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableView === 'annual'
                        ? result.yearByYear.map((row) => (
                            <tr key={row.year} className="ci-tr">
                              <td className="ci-td ci-td--left">{row.year}</td>
                              <td className="ci-td ci-td--right">
                                {formatCurrency(row.deposits, currency.code)}
                              </td>
                              <td className="ci-td ci-td--right ci-td--interest">
                                {formatCurrency(row.interest, currency.code)}
                              </td>
                              <td className="ci-td ci-td--right ci-td--total">
                                {formatCurrency(row.totalValue, currency.code)}
                              </td>
                            </tr>
                          ))
                        : result.monthByMonth.map((row) => (
                            <tr key={row.month} className="ci-tr">
                              <td className="ci-td ci-td--left">
                                Y{row.year} M{row.monthInYear}
                              </td>
                              <td className="ci-td ci-td--right">
                                {formatCurrency(row.deposits, currency.code)}
                              </td>
                              <td className="ci-td ci-td--right ci-td--interest">
                                {formatCurrency(row.interest, currency.code)}
                              </td>
                              <td className="ci-td ci-td--right ci-td--total">
                                {formatCurrency(row.totalValue, currency.code)}
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
