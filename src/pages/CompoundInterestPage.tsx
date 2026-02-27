import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import jsPDF from 'jspdf';
import { useCurrency } from '../state/CurrencyContext';
import { formatCurrency } from '../utils/currency';
import { useAuthGate } from '../hooks/useAuthGate';
import { LoginModal } from '../components/LoginModal';
import {
  calculateCompoundInterest,
  type CompoundInterestResult,
} from '../utils/compoundInterest';

// ── Chart colors matching the design system ──
const COLOR_INITIAL = '#60a5fa'; // blue — matches results panel "Initial Balance"
const COLOR_DEPOSITS = '#7c3aed'; // purple for additional deposits
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

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  return (
    <div className="ci-currency-input">
      <span className="ci-currency-prefix">{symbol}</span>
      <input
        type="text"
        inputMode="numeric"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onFocus={handleFocus}
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

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  return (
    <div className="ci-numeric-input">
      <input
        type="text"
        inputMode="decimal"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onFocus={handleFocus}
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

// ── Persistence ──
const CI_STORAGE_KEY = 'vf-compound-interest';

interface CIPersistedState {
  initialInvestment: number;
  recurringInvestment: number;
  recurringFrequency: 'monthly' | 'annually';
  mode: 'deposit' | 'withdrawal';
  annualGrowthRate: number;
  annualDepositIncrease: number;
  years: number;
}

function loadCIState(): Partial<CIPersistedState> {
  try {
    const raw = localStorage.getItem(CI_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

// ── Main Page ──
export function CompoundInterestPage() {
  const { currency } = useCurrency();
  const { gate, showLogin, onLoginSuccess, onLoginClose } = useAuthGate();

  // Load persisted values (or fallback to defaults)
  const navigate = useNavigate();
  const saved = useMemo(() => loadCIState(), []);

  // Inputs
  const [initialInvestment, setInitialInvestment] = useState(saved.initialInvestment ?? 10000);
  const [recurringInvestment, setRecurringInvestment] = useState(saved.recurringInvestment ?? 500);
  const [recurringFrequency, setRecurringFrequency] = useState<'monthly' | 'annually'>(saved.recurringFrequency ?? 'monthly');
  const [mode, setMode] = useState<'deposit' | 'withdrawal'>(saved.mode ?? 'deposit');
  const [annualGrowthRate, setAnnualGrowthRate] = useState(saved.annualGrowthRate ?? 6);
  const [annualDepositIncrease, setAnnualDepositIncrease] = useState(saved.annualDepositIncrease ?? 2);
  const [years, setYears] = useState(saved.years ?? 30);

  // Persist all form values
  useEffect(() => {
    try {
      localStorage.setItem(CI_STORAGE_KEY, JSON.stringify({
        initialInvestment,
        recurringInvestment,
        recurringFrequency,
        mode,
        annualGrowthRate,
        annualDepositIncrease,
        years,
      }));
    } catch {
      // ignore
    }
  }, [initialInvestment, recurringInvestment, recurringFrequency, mode, annualGrowthRate, annualDepositIncrease, years]);

  const isWithdrawal = mode === 'withdrawal';

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
      mode,
    });
  }, [initialInvestment, recurringInvestment, recurringFrequency, annualGrowthRate, annualDepositIncrease, years, mode, isValid, calcCounter]);

  const handleCalculate = useCallback(() => {
    setCalcCounter((c) => c + 1);
  }, []);

  // ── Export CSV ──
  const handleExportCsv = useCallback(() => {
    if (!result) return;
    const rows = tableView === 'annual' ? result.yearByYear : result.monthByMonth;
    const header = tableView === 'annual'
      ? ['Year', isWithdrawal ? 'Withdrawn' : 'Deposits', 'Interest', 'Total Value']
      : ['Month', isWithdrawal ? 'Withdrawn' : 'Deposits', 'Interest', 'Total Value'];

    const csvRows = [header.join(',')];
    for (const row of rows) {
      if (tableView === 'annual' && 'year' in row) {
        const r = row as typeof result.yearByYear[0];
        csvRows.push([
          r.year,
          isWithdrawal ? r.withdrawals : r.deposits,
          r.interest,
          r.totalValue,
        ].join(','));
      } else if ('month' in row) {
        const r = row as typeof result.monthByMonth[0];
        csvRows.push([
          `Y${r.year} M${r.monthInYear}`,
          isWithdrawal ? r.withdrawals : r.deposits,
          r.interest,
          r.totalValue,
        ].join(','));
      }
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compound-interest-${tableView}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, tableView, isWithdrawal]);

  // ── Export PDF ──
  const handleExportPdf = useCallback(() => {
    if (!result) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const margin = 16;
    const contentW = pw - margin * 2;
    let y = 16;

    // Header
    doc.setFillColor(11, 17, 32);
    doc.rect(0, 0, pw, 30, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(241, 245, 249);
    doc.text('Compound Interest Breakdown', margin, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`TakeHomeCalc.co.uk  |  ${tableView === 'annual' ? 'Annual' : 'Monthly'} View  |  ${isWithdrawal ? 'Withdrawal' : 'Deposit'} Mode`, margin, 22);
    y = 36;

    const rows = tableView === 'annual' ? result.yearByYear : result.monthByMonth;
    const colLabels = [
      tableView === 'annual' ? 'Year' : 'Month',
      isWithdrawal ? 'Withdrawn' : 'Deposits',
      'Interest',
      'Total Value',
    ];
    const colX = [margin + 2, margin + contentW * 0.25, margin + contentW * 0.5, margin + contentW * 0.75];

    // Table header
    doc.setFillColor(15, 23, 41);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    colLabels.forEach((lbl, i) => doc.text(lbl, colX[i], y + 5));
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const fmt = (n: number) => currency.symbol + Math.round(n).toLocaleString('en-GB');

    for (const row of rows) {
      if (y > 275) {
        doc.addPage();
        y = 16;
      }
      const isEven = rows.indexOf(row) % 2 === 0;
      if (isEven) {
        doc.setFillColor(22, 32, 50);
        doc.rect(margin, y, contentW, 6, 'F');
      }
      doc.setTextColor(148, 163, 184);
      if ('month' in row && 'monthInYear' in row) {
        const r = row as typeof result.monthByMonth[0];
        doc.text(`Y${r.year} M${r.monthInYear}`, colX[0], y + 4.5);
        doc.text(fmt(isWithdrawal ? r.withdrawals : r.deposits), colX[1], y + 4.5);
        doc.text(fmt(r.interest), colX[2], y + 4.5);
        doc.setTextColor(34, 211, 238);
        doc.text(fmt(r.totalValue), colX[3], y + 4.5);
      } else {
        const r = row as typeof result.yearByYear[0];
        doc.text(String(r.year), colX[0], y + 4.5);
        doc.text(fmt(isWithdrawal ? r.withdrawals : r.deposits), colX[1], y + 4.5);
        doc.text(fmt(r.interest), colX[2], y + 4.5);
        doc.setTextColor(34, 211, 238);
        doc.text(fmt(r.totalValue), colX[3], y + 4.5);
      }
      y += 6;
    }

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Generated by TakeHomeCalc.co.uk', pw / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });

    doc.save(`compound-interest-${tableView}.pdf`);
  }, [result, tableView, isWithdrawal, currency.symbol]);

  // Chart data — stacked positive segments only
  const chartData = useMemo(() => {
    if (!result) return [];
    return result.yearByYear.map((d) => {
      if (isWithdrawal) {
        // Withdrawal mode: totalValue = principal remaining + interest portion
        // Both segments are positive and stack to totalValue
        const remainingPrincipal = Math.max(0, result.initialInvestment - d.withdrawals);
        const interestPortion = d.totalValue - remainingPrincipal;
        return {
          year: d.year,
          'Remaining Balance': Math.max(0, remainingPrincipal),
          Interest: Math.max(0, interestPortion),
        };
      }
      // Deposit mode: Initial Balance (blue) + Additional Deposits (purple) + Interest (orange)
      return {
        year: d.year,
        'Initial Balance': result.initialInvestment,
        'Additional Deposits': d.deposits - result.initialInvestment,
        Interest: d.interest,
      };
    });
  }, [result, isWithdrawal]);

  return (
    <div className="ci-page">
      {showLogin && <LoginModal onClose={onLoginClose} onSuccess={onLoginSuccess} />}
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

            {/* Deposit / Withdrawal mode toggle */}
            <div className="ci-mode-toggle-field">
              <div className="ci-mode-toggle-group">
                <button
                  className={`ci-mode-btn ${!isWithdrawal ? 'ci-mode-btn--active ci-mode-btn--deposit' : ''}`}
                  onClick={() => setMode('deposit')}
                >
                  Deposit
                </button>
                <button
                  className={`ci-mode-btn ${isWithdrawal ? 'ci-mode-btn--active ci-mode-btn--withdrawal' : ''}`}
                  onClick={() => setMode('withdrawal')}
                >
                  Withdrawal
                </button>
              </div>
            </div>

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

            {/* Recurring Amount + Mode toggle */}
            <div className="ci-field">
              <label className="ci-label">
                {isWithdrawal ? 'Recurring Withdrawal' : 'Recurring Deposit'}
              </label>
              <div className="ci-row">
                <CurrencyInput
                  value={recurringInvestment}
                  onChange={setRecurringInvestment}
                  symbol={currency.symbol}
                  ariaLabel={isWithdrawal ? 'Recurring withdrawal amount' : 'Recurring deposit amount'}
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

            {/* Increase Annual Amount */}
            <div className="ci-field">
              <label className="ci-label">
                {isWithdrawal ? 'Annual Withdrawal Increase' : 'Annual Deposit Increase'}
              </label>
              <div className="ci-segment-group">
                {DEPOSIT_INCREASE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    className={`ci-segment-btn ${annualDepositIncrease === opt ? 'ci-segment-btn--active' : ''}`}
                    onClick={() => setAnnualDepositIncrease(opt)}
                    aria-label={`${opt}% annual ${isWithdrawal ? 'withdrawal' : 'deposit'} increase`}
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
                {isWithdrawal ? (
                  <div className="ci-result-item">
                    <span className="ci-result-label">Total Withdrawn</span>
                    <AnimatedValue
                      value={formatCurrency(result.totalWithdrawals, currency.code)}
                      className="ci-result-value--red"
                    />
                  </div>
                ) : (
                  <div className="ci-result-item">
                    <span className="ci-result-label">Additional Deposits</span>
                    <AnimatedValue
                      value={formatCurrency(result.totalDeposits - result.initialInvestment, currency.code)}
                      className="ci-result-value--purple"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stacked Bar Chart */}
          {result && chartData.length > 0 && (
            <div className="ci-card ci-chart-card">
              <h2 className="ci-card-title">
                {isWithdrawal ? 'Portfolio Drawdown' : 'Portfolio Growth'}
              </h2>
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
                    {isWithdrawal ? (
                      <>
                        <Bar
                          dataKey="Remaining Balance"
                          stackId="portfolio"
                          fill={COLOR_INITIAL}
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
                      </>
                    ) : (
                      <>
                        <Bar
                          dataKey="Initial Balance"
                          stackId="portfolio"
                          fill={COLOR_INITIAL}
                          radius={[0, 0, 0, 0]}
                          animationDuration={800}
                        />
                        <Bar
                          dataKey="Additional Deposits"
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
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Full-width Breakdown Table (below both columns) ── */}
      {result && (
        <div className="ci-card ci-table-card ci-table-card--full">
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
              <div className="ci-table-controls">
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
                <div className="ci-export-group">
                  <button className="ci-export-btn" onClick={() => gate(() => handleExportCsv())}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    CSV
                  </button>
                  <button className="ci-export-btn" onClick={() => gate(() => handleExportPdf())}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    PDF
                  </button>
                </div>
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
                    <th className="ci-th ci-th--right">
                      {isWithdrawal ? 'Withdrawn' : 'Deposits'}
                    </th>
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
                            {isWithdrawal
                              ? formatCurrency(row.withdrawals, currency.code)
                              : formatCurrency(row.deposits, currency.code)}
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
                            {isWithdrawal
                              ? formatCurrency(row.withdrawals, currency.code)
                              : formatCurrency(row.deposits, currency.code)}
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

      {/* CTA: bridge to portfolio simulator */}
      {result && (
        <div className="ci-simulate-cta">
          <button className="thp-cta" onClick={() => navigate('/portfolio')}>
            Build Your Future Scenarios →
          </button>
        </div>
      )}
    </div>
  );
}
