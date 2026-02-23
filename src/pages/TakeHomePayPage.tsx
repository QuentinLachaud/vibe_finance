import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../state/CurrencyContext';
import { useCalculator } from '../state/CalculatorContext';
import { formatCurrency } from '../utils/currency';
import { exportTakeHomePdf } from '../utils/exportPdf';
import { usePersistedState } from '../hooks/usePersistedState';
import { useAuthGate } from '../hooks/useAuthGate';
import { LoginModal } from '../components/LoginModal';

// ══════════════════════════════════════════════
//  UK Tax/NI calculation engine (2025-26 rates)
// ══════════════════════════════════════════════

type Region = 'england' | 'scotland';
type SalaryPeriod = 'annual' | 'monthly' | 'weekly';

interface TaxBreakdown {
  grossAnnual: number;
  pensionSacrifice: number;
  taxableIncome: number; // after sacrifice & personal allowance
  personalAllowance: number;
  incomeTax: number;
  nationalInsurance: number;
  totalDeductions: number;
  netAnnual: number;
  netMonthly: number;
  netWeekly: number;
  effectiveRate: number; // %
  taxBands: { name: string; rate: string; amount: number }[];
  niBands: { name: string; rate: string; amount: number }[];
}

// 2025-26 England/Wales/NI tax bands
const ENGLAND_BANDS = [
  { name: 'Basic Rate', lo: 0, hi: 37_700, rate: 0.20 },
  { name: 'Higher Rate', lo: 37_700, hi: 125_140, rate: 0.40 },
  { name: 'Additional Rate', lo: 125_140, hi: Infinity, rate: 0.45 },
];

// 2025-26 Scotland bands
const SCOTLAND_BANDS = [
  { name: 'Starter Rate', lo: 0, hi: 2_306, rate: 0.19 },
  { name: 'Basic Rate', lo: 2_306, hi: 13_991, rate: 0.20 },
  { name: 'Intermediate Rate', lo: 13_991, hi: 31_092, rate: 0.21 },
  { name: 'Higher Rate', lo: 31_092, hi: 62_430, rate: 0.42 },
  { name: 'Advanced Rate', lo: 62_430, hi: 125_140, rate: 0.45 },
  { name: 'Top Rate', lo: 125_140, hi: Infinity, rate: 0.48 },
];

// National Insurance Class 1 (employee) 2025-26
const NI_THRESHOLD = 12_570; // Primary Threshold
const NI_UEL = 50_270; // Upper Earnings Limit
const NI_RATE_MAIN = 0.08; // between PT and UEL
const NI_RATE_UPPER = 0.02; // above UEL

const PERSONAL_ALLOWANCE = 12_570;
const PA_THRESHOLD = 100_000; // starts reducing

function calcPersonalAllowance(grossAnnual: number): number {
  if (grossAnnual <= PA_THRESHOLD) return PERSONAL_ALLOWANCE;
  const reduction = Math.floor((grossAnnual - PA_THRESHOLD) / 2);
  return Math.max(0, PERSONAL_ALLOWANCE - reduction);
}

function calcIncomeTax(taxableIncome: number, bands: typeof ENGLAND_BANDS): { total: number; breakdown: { name: string; rate: string; amount: number }[] } {
  let remaining = Math.max(0, taxableIncome);
  let total = 0;
  const breakdown: { name: string; rate: string; amount: number }[] = [];

  for (const band of bands) {
    const bandWidth = band.hi - band.lo;
    const inBand = Math.min(remaining, bandWidth);
    if (inBand <= 0) {
      breakdown.push({ name: band.name, rate: `${(band.rate * 100).toFixed(0)}%`, amount: 0 });
      continue;
    }
    const tax = inBand * band.rate;
    total += tax;
    breakdown.push({ name: band.name, rate: `${(band.rate * 100).toFixed(0)}%`, amount: Math.round(tax) });
    remaining -= inBand;
  }

  return { total, breakdown };
}

function calcNI(grossAnnual: number): { total: number; breakdown: { name: string; rate: string; amount: number }[] } {
  const breakdown: { name: string; rate: string; amount: number }[] = [];
  let total = 0;

  // Below primary threshold — no NI
  const abovePT = Math.max(0, grossAnnual - NI_THRESHOLD);
  const mainBand = Math.min(abovePT, NI_UEL - NI_THRESHOLD);
  const upperBand = Math.max(0, abovePT - (NI_UEL - NI_THRESHOLD));

  const niMain = mainBand * NI_RATE_MAIN;
  const niUpper = upperBand * NI_RATE_UPPER;
  total = niMain + niUpper;

  breakdown.push({ name: `${formatNum(NI_THRESHOLD)}–${formatNum(NI_UEL)}`, rate: '8%', amount: Math.round(niMain) });
  if (upperBand > 0) {
    breakdown.push({ name: `Above ${formatNum(NI_UEL)}`, rate: '2%', amount: Math.round(niUpper) });
  }

  return { total, breakdown };
}

function formatNum(n: number): string {
  return `£${n.toLocaleString('en-GB')}`;
}

function computeTax(gross: number, region: Region, sacrificePct: number, sacrificeFixed: number): TaxBreakdown {
  // Salary sacrifice reduces gross
  const sacrificeFromPct = gross * (sacrificePct / 100);
  const pensionSacrifice = Math.round(sacrificeFromPct + sacrificeFixed);
  const adjustedGross = Math.max(0, gross - pensionSacrifice);

  const pa = calcPersonalAllowance(adjustedGross);
  const taxableIncome = Math.max(0, adjustedGross - pa);

  const bands = region === 'scotland' ? SCOTLAND_BANDS : ENGLAND_BANDS;
  const { total: incomeTax, breakdown: taxBands } = calcIncomeTax(taxableIncome, bands);
  const { total: ni, breakdown: niBands } = calcNI(adjustedGross);

  const totalDeductions = Math.round(incomeTax + ni);
  const netAnnual = adjustedGross - totalDeductions;

  return {
    grossAnnual: gross,
    pensionSacrifice,
    taxableIncome: Math.round(taxableIncome),
    personalAllowance: pa,
    incomeTax: Math.round(incomeTax),
    nationalInsurance: Math.round(ni),
    totalDeductions,
    netAnnual: Math.round(netAnnual),
    netMonthly: Math.round(netAnnual / 12),
    netWeekly: Math.round(netAnnual / 52),
    effectiveRate: gross > 0 ? Math.round(((incomeTax + ni) / gross) * 1000) / 10 : 0,
    taxBands,
    niBands,
  };
}

// ══════════════════════════════════════════════
//  JSON data model for persistence
// ══════════════════════════════════════════════

export interface TakeHomePayData {
  version: 1;
  salary: number;
  period: SalaryPeriod;
  region: Region;
  salarySacrifice: boolean;
  sacrificePct: number;
  sacrificeFixed: number;
  lastModified: string;
}

// ══════════════════════════════════════════════
//  Component
// ══════════════════════════════════════════════

export function TakeHomePayPage() {
  const { currency } = useCurrency();
  const navigate = useNavigate();
  const { dispatch } = useCalculator();

  const [data, setData] = usePersistedState<TakeHomePayData>('vf-take-home-pay', {
    version: 1,
    salary: 35000,
    period: 'annual' as SalaryPeriod,
    region: 'england' as Region,
    salarySacrifice: false,
    sacrificePct: 0,
    sacrificeFixed: 0,
    lastModified: new Date().toISOString(),
  });

  const [showBreakdown, setShowBreakdown] = useState(false);
  const { gate, showLogin, onLoginSuccess, onLoginClose } = useAuthGate();

  const updateField = useCallback(<K extends keyof TakeHomePayData>(key: K, value: TakeHomePayData[K]) => {
    setData((prev) => ({ ...prev, [key]: value, lastModified: new Date().toISOString() }));
  }, [setData]);

  // Convert entered salary to annual
  const grossAnnual = useMemo(() => {
    switch (data.period) {
      case 'monthly': return data.salary * 12;
      case 'weekly': return data.salary * 52;
      default: return data.salary;
    }
  }, [data.salary, data.period]);

  const result = useMemo(
    () => computeTax(grossAnnual, data.region, data.salarySacrifice ? data.sacrificePct : 0, data.salarySacrifice ? data.sacrificeFixed : 0),
    [grossAnnual, data.region, data.salarySacrifice, data.sacrificePct, data.sacrificeFixed],
  );

  const handleSeeHowMuch = () => {
    // Set the calculator income to monthly net pay
    dispatch({ type: 'SET_INCOME', payload: result.netMonthly });
    dispatch({ type: 'SET_INCOME_FREQUENCY', payload: 'monthly' });
    navigate('/calculator');
    // On mobile, scroll to top after navigation
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  return (
    <div className="page-container">
      {showLogin && <LoginModal onClose={onLoginClose} onSuccess={onLoginSuccess} />}
      <div className="ps-page">
        {/* Header */}
        <div className="thp-header">
          <h1 className="ps-page-title">Take Home Pay</h1>
          <p className="thp-subtitle">See exactly what you'll take home after tax and National Insurance.</p>
        </div>

        <div className="thp-layout">
          {/* Left column */}
          <div className="thp-left-col">
            {/* Input card */}
            <div className="ps-card thp-input-card">
            {/* Region toggle */}
            <div className="thp-row">
              <label className="thp-label">Tax Region</label>
              <div className="thp-region-toggle">
                <button
                  className={`thp-region-btn ${data.region === 'england' ? 'thp-region-btn--active' : ''}`}
                  onClick={() => updateField('region', 'england')}
                >
                  🏴󠁧󠁢󠁥󠁮󠁧󠁿 England
                </button>
                <button
                  className={`thp-region-btn ${data.region === 'scotland' ? 'thp-region-btn--active' : ''}`}
                  onClick={() => updateField('region', 'scotland')}
                >
                  🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scotland
                </button>
              </div>
            </div>

            {/* Salary input */}
            <div className="thp-row">
              <label className="thp-label">Salary</label>
              <div className="thp-salary-row">
                <span className="thp-currency">{currency.symbol}</span>
                <input
                  className="thp-salary-input"
                  type="text"
                  inputMode="numeric"
                  value={data.salary || ''}
                  onChange={(e) => {
                    const v = Number(e.target.value.replace(/,/g, ''));
                    if (!isNaN(v)) updateField('salary', v);
                  }}
                  placeholder="35,000"
                />
                <div className="thp-period-toggle">
                  {(['annual', 'monthly', 'weekly'] as SalaryPeriod[]).map((p) => (
                    <button
                      key={p}
                      className={`thp-period-btn ${data.period === p ? 'thp-period-btn--active' : ''}`}
                      onClick={() => updateField('period', p)}
                    >
                      {p === 'annual' ? 'Year' : p === 'monthly' ? 'Month' : 'Week'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Salary sacrifice */}
            <div className="thp-row thp-row--sacrifice">
              <label className="thp-sacrifice-label">
                <input
                  type="checkbox"
                  className="thp-checkbox"
                  checked={data.salarySacrifice}
                  onChange={(e) => updateField('salarySacrifice', e.target.checked)}
                />
                <span>Salary Sacrifice</span>
              </label>

              {data.salarySacrifice && (
                <div className="thp-sacrifice-inputs">
                  <div className="thp-sacrifice-field">
                    <label className="thp-sacrifice-field-label">Percentage</label>
                    <div className="thp-sacrifice-input-wrap">
                      <input
                        className="thp-sacrifice-input"
                        type="text"
                        inputMode="numeric"
                        value={data.sacrificePct || ''}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (!isNaN(v) && v >= 0 && v <= 100) updateField('sacrificePct', v);
                        }}
                        placeholder="5"
                      />
                      <span className="thp-sacrifice-unit">%</span>
                    </div>
                  </div>
                  <span className="thp-sacrifice-or">or</span>
                  <div className="thp-sacrifice-field">
                    <label className="thp-sacrifice-field-label">Fixed amount (annual)</label>
                    <div className="thp-sacrifice-input-wrap">
                      <span className="thp-sacrifice-unit">{currency.symbol}</span>
                      <input
                        className="thp-sacrifice-input"
                        type="text"
                        inputMode="numeric"
                        value={data.sacrificeFixed || ''}
                        onChange={(e) => {
                          const v = Number(e.target.value.replace(/,/g, ''));
                          if (!isNaN(v)) updateField('sacrificeFixed', v);
                        }}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

            {/* Breakdown — collapsible, below input card */}
            <div className="ps-card thp-breakdown-card">
              <button className="thp-breakdown-toggle" onClick={() => setShowBreakdown(!showBreakdown)}>
                <span>Tax &amp; NI Breakdown</span>
                <span className={`thp-breakdown-chevron ${showBreakdown ? 'thp-breakdown-chevron--open' : ''}`}>▼</span>
              </button>

              {showBreakdown && (
                <div className="thp-breakdown">
                  <div className="thp-breakdown-section">
                    <h4 className="thp-breakdown-heading">Income Tax ({data.region === 'scotland' ? 'Scotland' : 'England'})</h4>
                    <div className="thp-breakdown-grid">
                      <span className="thp-breakdown-cell thp-breakdown-cell--head">Band</span>
                      <span className="thp-breakdown-cell thp-breakdown-cell--head">Rate</span>
                      <span className="thp-breakdown-cell thp-breakdown-cell--head" style={{ textAlign: 'right' }}>Tax</span>
                      {result.taxBands.map((b) => (
                        <div className="thp-breakdown-band" key={b.name}>
                          <span className="thp-breakdown-cell">{b.name}</span>
                          <span className="thp-breakdown-cell">{b.rate}</span>
                          <span className="thp-breakdown-cell" style={{ textAlign: 'right' }}>{formatCurrency(b.amount, currency.code)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="thp-breakdown-total">
                      <span>Total Income Tax</span>
                      <span>{formatCurrency(result.incomeTax, currency.code)}</span>
                    </div>
                  </div>

                  <div className="thp-breakdown-section">
                    <h4 className="thp-breakdown-heading">National Insurance (Class 1)</h4>
                    <div className="thp-breakdown-grid">
                      <span className="thp-breakdown-cell thp-breakdown-cell--head">Earnings Band</span>
                      <span className="thp-breakdown-cell thp-breakdown-cell--head">Rate</span>
                      <span className="thp-breakdown-cell thp-breakdown-cell--head" style={{ textAlign: 'right' }}>NI</span>
                      {result.niBands.map((b) => (
                        <div className="thp-breakdown-band" key={b.name}>
                          <span className="thp-breakdown-cell">{b.name}</span>
                          <span className="thp-breakdown-cell">{b.rate}</span>
                          <span className="thp-breakdown-cell" style={{ textAlign: 'right' }}>{formatCurrency(b.amount, currency.code)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="thp-breakdown-total">
                      <span>Total NI</span>
                      <span>{formatCurrency(result.nationalInsurance, currency.code)}</span>
                    </div>
                  </div>

                  <div className="thp-breakdown-section">
                    <h4 className="thp-breakdown-heading">Summary</h4>
                    <div className="thp-summary-rows">
                      <div className="thp-summary-row">
                        <span>Gross Salary</span>
                        <span>{formatCurrency(result.grossAnnual, currency.code)}</span>
                      </div>
                      {result.pensionSacrifice > 0 && (
                        <div className="thp-summary-row">
                          <span>Salary Sacrifice</span>
                          <span className="thp-kpi-value--sac">−{formatCurrency(result.pensionSacrifice, currency.code)}</span>
                        </div>
                      )}
                      <div className="thp-summary-row">
                        <span>Personal Allowance</span>
                        <span>{formatCurrency(result.personalAllowance, currency.code)}</span>
                      </div>
                      <div className="thp-summary-row">
                        <span>Income Tax</span>
                        <span className="thp-kpi-value--tax">−{formatCurrency(result.incomeTax, currency.code)}</span>
                      </div>
                      <div className="thp-summary-row">
                        <span>National Insurance</span>
                        <span className="thp-kpi-value--ni">−{formatCurrency(result.nationalInsurance, currency.code)}</span>
                      </div>
                      <div className="thp-summary-row thp-summary-row--total">
                        <span>Net Annual Pay</span>
                        <span>{formatCurrency(result.netAnnual, currency.code)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Result card */}
          <div className="ps-card thp-result-card">
            <div className="thp-result-hero">
              <span className="thp-result-label">Your Monthly Take Home Pay</span>
              <span className="thp-result-amount">{formatCurrency(result.netMonthly, currency.code)}</span>
              <span className="thp-result-sub">
                {formatCurrency(result.netAnnual, currency.code)}/year · {formatCurrency(result.netWeekly, currency.code)}/week
              </span>
            </div>

            {/* Quick KPIs */}
            <div className="thp-kpi-row">
              <div className="thp-kpi">
                <span className="thp-kpi-label">Income Tax</span>
                <span className="thp-kpi-value thp-kpi-value--tax">{formatCurrency(result.incomeTax, currency.code)}</span>
              </div>
              <div className="thp-kpi">
                <span className="thp-kpi-label">National Insurance</span>
                <span className="thp-kpi-value thp-kpi-value--ni">{formatCurrency(result.nationalInsurance, currency.code)}</span>
              </div>
              <div className="thp-kpi">
                <span className="thp-kpi-label">Effective Rate</span>
                <span className="thp-kpi-value">{result.effectiveRate}%</span>
              </div>
              {result.pensionSacrifice > 0 && (
                <div className="thp-kpi">
                  <span className="thp-kpi-label">Salary Sacrifice</span>
                  <span className="thp-kpi-value thp-kpi-value--sac">{formatCurrency(result.pensionSacrifice, currency.code)}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="thp-actions">
              <button className="thp-cta" onClick={handleSeeHowMuch}>
                 See how much you can save →
              </button>
              <button
                className="thp-export-btn"
                onClick={() => gate(() => exportTakeHomePdf(result, data.region, currency.symbol))}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export PDF Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
