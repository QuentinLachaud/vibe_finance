import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCurrency } from '../state/CurrencyContext';
import { useCalculator } from '../state/CalculatorContext';
import { formatCurrency } from '../utils/currency';
import { exportTakeHomePdf, exportHouseholdTakeHomePdf } from '../utils/exportPdf';
import { usePersistedState } from '../hooks/usePersistedState';
import { useSavedReports } from '../hooks/useSavedReports';
import { useAuthGate } from '../hooks/useAuthGate';
import { LoginModal } from '../components/LoginModal';
import type { CurrencyCode } from '../types';
import {
  annualiseSalary,
  calculateTakeHome,
  type Region,
  type SalaryPeriod,
  type TaxBreakdown,
} from '../utils/takeHomeTax';

function downloadDataUrlMobileSafe(dataUrl: string, filename: string) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) {
    window.open(dataUrl, '_blank', 'noopener');
    return;
  }

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ══════════════════════════════════════════════
//  JSON data model for persistence
// ══════════════════════════════════════════════

export interface TakeHomePayData {
  version: 1;
  householdMode: boolean;
  salary: number;
  period: SalaryPeriod;
  region: Region;
  salarySacrifice: boolean;
  sacrificePct: number;
  sacrificeFixed: number;
  partner1Name: string;
  partner2Name: string;
  partner2Salary: number;
  partner2Period: SalaryPeriod;
  partner2Region: Region;
  partner2SalarySacrifice: boolean;
  partner2SacrificePct: number;
  partner2SacrificeFixed: number;
  lastModified: string;
}

const THP_DEFAULTS: TakeHomePayData = {
  version: 1,
  householdMode: false,
  salary: 35000,
  period: 'annual',
  region: 'england',
  salarySacrifice: false,
  sacrificePct: 0,
  sacrificeFixed: 0,
  partner1Name: 'Partner 1',
  partner2Name: 'Partner 2',
  partner2Salary: 30000,
  partner2Period: 'annual',
  partner2Region: 'england',
  partner2SalarySacrifice: false,
  partner2SacrificePct: 0,
  partner2SacrificeFixed: 0,
  lastModified: new Date().toISOString(),
};

// ══════════════════════════════════════════════
//  Inline editable name
// ══════════════════════════════════════════════

function EditableName({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    onChange(trimmed || value);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="thp-name-input"
        value={draft}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        maxLength={24}
      />
    );
  }

  return (
    <span
      className="thp-name-display"
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      title="Click to rename"
    >
      {value}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    </span>
  );
}

// ══════════════════════════════════════════════
//  Partner input fields sub-component
// ══════════════════════════════════════════════

interface PartnerInputProps {
  salary: number;
  period: SalaryPeriod;
  region: Region;
  salarySacrifice: boolean;
  sacrificePct: number;
  sacrificeFixed: number;
  currencySymbol: string;
  onSalaryChange: (v: number) => void;
  onPeriodChange: (v: SalaryPeriod) => void;
  onRegionChange: (v: Region) => void;
  onSalarySacrificeChange: (v: boolean) => void;
  onSacrificePctChange: (v: number) => void;
  onSacrificeFixedChange: (v: number) => void;
}

function PartnerInputFields({
  salary, period, region, salarySacrifice, sacrificePct, sacrificeFixed,
  currencySymbol,
  onSalaryChange, onPeriodChange, onRegionChange,
  onSalarySacrificeChange, onSacrificePctChange, onSacrificeFixedChange,
}: PartnerInputProps) {
  return (
    <>
      {/* Region toggle */}
      <div className="thp-row">
        <label className="thp-label">Tax Region</label>
        <div className="thp-region-toggle">
          <button
            className={`thp-region-btn ${region === 'england' ? 'thp-region-btn--active' : ''}`}
            onClick={() => onRegionChange('england')}
          >
            🏴󠁧󠁢󠁥󠁮󠁧󠁿 England
          </button>
          <button
            className={`thp-region-btn ${region === 'scotland' ? 'thp-region-btn--active' : ''}`}
            onClick={() => onRegionChange('scotland')}
          >
            🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scotland
          </button>
        </div>
      </div>

      {/* Salary input */}
      <div className="thp-row">
        <label className="thp-label">Salary</label>
        <div className="thp-salary-row">
          <span className="thp-currency">{currencySymbol}</span>
          <input
            className="thp-salary-input"
            type="text"
            inputMode="numeric"
            value={salary || ''}
            onChange={(e) => {
              const v = Number(e.target.value.replace(/,/g, ''));
              if (!isNaN(v)) onSalaryChange(v);
            }}
            onFocus={(e) => e.target.select()}
            placeholder="35,000"
          />
          <div className="thp-period-toggle">
            {(['annual', 'monthly', 'weekly'] as SalaryPeriod[]).map((p) => (
              <button
                key={p}
                className={`thp-period-btn ${period === p ? 'thp-period-btn--active' : ''}`}
                onClick={() => onPeriodChange(p)}
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
            checked={salarySacrifice}
            onChange={(e) => onSalarySacrificeChange(e.target.checked)}
          />
          <span>Salary Sacrifice</span>
        </label>

        {salarySacrifice && (
          <div className="thp-sacrifice-inputs">
            <div className="thp-sacrifice-field">
              <label className="thp-sacrifice-field-label">Percentage</label>
              <div className="thp-sacrifice-input-wrap">
                <input
                  className="thp-sacrifice-input"
                  type="text"
                  inputMode="numeric"
                  value={sacrificePct || ''}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!isNaN(v) && v >= 0 && v <= 100) onSacrificePctChange(v);
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="5"
                />
                <span className="thp-sacrifice-unit">%</span>
              </div>
            </div>
            <span className="thp-sacrifice-or">or</span>
            <div className="thp-sacrifice-field">
              <label className="thp-sacrifice-field-label">Fixed amount (annual)</label>
              <div className="thp-sacrifice-input-wrap">
                <span className="thp-sacrifice-unit">{currencySymbol}</span>
                <input
                  className="thp-sacrifice-input"
                  type="text"
                  inputMode="numeric"
                  value={sacrificeFixed || ''}
                  onChange={(e) => {
                    const v = Number(e.target.value.replace(/,/g, ''));
                    if (!isNaN(v)) onSacrificeFixedChange(v);
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════
//  Breakdown content sub-component
// ══════════════════════════════════════════════

function BreakdownContent({
  result,
  region,
  currencyCode,
}: {
  result: TaxBreakdown;
  region: Region;
  currencyCode: CurrencyCode;
}) {
  return (
    <div className="thp-breakdown">
      <div className="thp-breakdown-section">
        <h4 className="thp-breakdown-heading">Income Tax ({region === 'scotland' ? 'Scotland' : 'England'})</h4>
        <div className="thp-breakdown-grid">
          <span className="thp-breakdown-cell thp-breakdown-cell--head">Band</span>
          <span className="thp-breakdown-cell thp-breakdown-cell--head">Rate</span>
          <span className="thp-breakdown-cell thp-breakdown-cell--head" style={{ textAlign: 'right' }}>Tax</span>
          {result.taxBands.map((b) => (
            <div className="thp-breakdown-band" key={b.name}>
              <span className="thp-breakdown-cell">{b.name}</span>
              <span className="thp-breakdown-cell">{b.rate}</span>
              <span className="thp-breakdown-cell" style={{ textAlign: 'right' }}>{formatCurrency(b.amount, currencyCode)}</span>
            </div>
          ))}
        </div>
        <div className="thp-breakdown-total">
          <span>Total Income Tax</span>
          <span>{formatCurrency(result.incomeTax, currencyCode)}</span>
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
              <span className="thp-breakdown-cell" style={{ textAlign: 'right' }}>{formatCurrency(b.amount, currencyCode)}</span>
            </div>
          ))}
        </div>
        <div className="thp-breakdown-total">
          <span>Total NI</span>
          <span>{formatCurrency(result.nationalInsurance, currencyCode)}</span>
        </div>
      </div>

      <div className="thp-breakdown-section">
        <h4 className="thp-breakdown-heading">Summary</h4>
        <div className="thp-summary-rows">
          <div className="thp-summary-row">
            <span>Gross Salary</span>
            <span>{formatCurrency(result.grossAnnual, currencyCode)}</span>
          </div>
          {result.pensionSacrifice > 0 && (
            <div className="thp-summary-row">
              <span>Salary Sacrifice</span>
              <span className="thp-kpi-value--sac">−{formatCurrency(result.pensionSacrifice, currencyCode)}</span>
            </div>
          )}
          <div className="thp-summary-row">
            <span>Personal Allowance</span>
            <span>{formatCurrency(result.personalAllowance, currencyCode)}</span>
          </div>
          <div className="thp-summary-row">
            <span>Income Tax</span>
            <span className="thp-kpi-value--tax">−{formatCurrency(result.incomeTax, currencyCode)}</span>
          </div>
          <div className="thp-summary-row">
            <span>National Insurance</span>
            <span className="thp-kpi-value--ni">−{formatCurrency(result.nationalInsurance, currencyCode)}</span>
          </div>
          <div className="thp-summary-row thp-summary-row--total">
            <span>Net Annual Pay</span>
            <span>{formatCurrency(result.netAnnual, currencyCode)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  Component
// ══════════════════════════════════════════════

import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function TakeHomePayPage() {
  useDocumentTitle('Take Home Pay Calculator | TakeHomeCalc');
  const { currency } = useCurrency();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { dispatch } = useCalculator();

  const [rawData, setData] = usePersistedState<TakeHomePayData>('vf-take-home-pay', THP_DEFAULTS);
  const data = useMemo(() => ({ ...THP_DEFAULTS, ...rawData }), [rawData]);

  const [showBreakdown, setShowBreakdown] = useState(false);
  const [activePartner, setActivePartner] = useState<1 | 2>(1);
  const [breakdownPartner, setBreakdownPartner] = useState<1 | 2>(1);
  const didApplySearchParams = useRef(false);
  const { gate, showLogin, onLoginSuccess, onLoginClose } = useAuthGate();
  const { addReport } = useSavedReports();

  const updateField = useCallback(<K extends keyof TakeHomePayData>(key: K, value: TakeHomePayData[K]) => {
    setData((prev) => ({ ...THP_DEFAULTS, ...prev, [key]: value, lastModified: new Date().toISOString() }));
  }, [setData]);

  // Convert entered salary to annual
  useEffect(() => {
    if (didApplySearchParams.current) return;

    const salaryValue = searchParams.get('salary');
    if (!salaryValue) return;

    const salary = Number(salaryValue.replace(/,/g, ''));
    if (!Number.isFinite(salary) || salary <= 0) return;

    const periodParam = searchParams.get('period');
    const regionParam = searchParams.get('region');
    const sacrificePctParam = searchParams.get('sacrificePct');
    const sacrificeFixedParam = searchParams.get('sacrificeFixed');

    const period: SalaryPeriod = periodParam === 'monthly' || periodParam === 'weekly' ? periodParam : 'annual';
    const region: Region = regionParam === 'scotland' ? 'scotland' : 'england';
    const sacrificePct = Number(sacrificePctParam ?? 0);
    const sacrificeFixed = Number(sacrificeFixedParam ?? 0);

    didApplySearchParams.current = true;
    setData((prev) => ({
      ...THP_DEFAULTS,
      ...prev,
      householdMode: false,
      salary,
      period,
      region,
      salarySacrifice: sacrificePct > 0 || sacrificeFixed > 0,
      sacrificePct: Number.isFinite(sacrificePct) ? sacrificePct : 0,
      sacrificeFixed: Number.isFinite(sacrificeFixed) ? sacrificeFixed : 0,
      lastModified: new Date().toISOString(),
    }));
  }, [searchParams, setData]);

  const grossAnnual = useMemo(() => annualiseSalary(data.salary, data.period), [data.salary, data.period]);

  const result = useMemo(
    () => calculateTakeHome(grossAnnual, data.region, data.salarySacrifice ? data.sacrificePct : 0, data.salarySacrifice ? data.sacrificeFixed : 0),
    [grossAnnual, data.region, data.salarySacrifice, data.sacrificePct, data.sacrificeFixed],
  );

  // Partner 2 computations (household mode)
  const grossAnnual2 = useMemo(
    () => (data.householdMode ? annualiseSalary(data.partner2Salary, data.partner2Period) : 0),
    [data.householdMode, data.partner2Salary, data.partner2Period],
  );

  const result2 = useMemo(
    () => data.householdMode
      ? calculateTakeHome(grossAnnual2, data.partner2Region, data.partner2SalarySacrifice ? data.partner2SacrificePct : 0, data.partner2SalarySacrifice ? data.partner2SacrificeFixed : 0)
      : null,
    [data.householdMode, grossAnnual2, data.partner2Region, data.partner2SalarySacrifice, data.partner2SacrificePct, data.partner2SacrificeFixed],
  );

  const householdMonthly = data.householdMode && result2 ? result.netMonthly + result2.netMonthly : result.netMonthly;
  const householdAnnual = data.householdMode && result2 ? result.netAnnual + result2.netAnnual : result.netAnnual;
  const householdWeekly = data.householdMode && result2 ? result.netWeekly + result2.netWeekly : result.netWeekly;

  const breakdownResult = breakdownPartner === 1 ? result : result2!;
  const breakdownRegion = breakdownPartner === 1 ? data.region : data.partner2Region;

  const handleSeeHowMuch = () => {
    dispatch({ type: 'SET_INCOME', payload: householdMonthly });
    dispatch({ type: 'SET_INCOME_FREQUENCY', payload: 'monthly' });
    navigate('/calculator');
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  return (
    <div className="page-container">
      {showLogin && <LoginModal onClose={onLoginClose} onSuccess={onLoginSuccess} />}
      <div className="ps-page">
        {/* Header */}
        <div className="thp-header">
          <div className="thp-header-top">
            <div>
              <h1 className="ps-page-title">
                {data.householdMode ? 'Household Take Home Pay' : 'Take Home Pay'}
              </h1>
              <p className="thp-subtitle">
                {data.householdMode
                  ? 'See what your household takes home after tax and National Insurance.'
                  : "See exactly what you'll take home after tax and National Insurance."}
              </p>
            </div>
            <div className="thp-mode-toggle">
              <button
                className={`thp-mode-btn ${!data.householdMode ? 'thp-mode-btn--active' : ''}`}
                onClick={() => updateField('householdMode', false)}
              >
                <span className="thp-mode-icon">👤</span> Individual
              </button>
              <button
                className={`thp-mode-btn ${data.householdMode ? 'thp-mode-btn--active' : ''}`}
                onClick={() => updateField('householdMode', true)}
              >
                <span className="thp-mode-icon">👥</span> Household
              </button>
            </div>
          </div>
        </div>

        <div className="thp-layout">
          {/* Left column */}
          <div className="thp-left-col">
            {/* Input card */}
            <div className="ps-card thp-input-card">
              {data.householdMode && (
                <div className="thp-partner-tabs">
                  <div
                    className={`thp-partner-tab ${activePartner === 1 ? 'thp-partner-tab--active' : ''}`}
                    onClick={() => setActivePartner(1)}
                  >
                    <EditableName
                      value={data.partner1Name}
                      onChange={(v) => updateField('partner1Name', v)}
                    />
                  </div>
                  <div
                    className={`thp-partner-tab ${activePartner === 2 ? 'thp-partner-tab--active' : ''}`}
                    onClick={() => setActivePartner(2)}
                  >
                    <EditableName
                      value={data.partner2Name}
                      onChange={(v) => updateField('partner2Name', v)}
                    />
                  </div>
                </div>
              )}

              {(!data.householdMode || activePartner === 1) && (
                <PartnerInputFields
                  salary={data.salary}
                  period={data.period}
                  region={data.region}
                  salarySacrifice={data.salarySacrifice}
                  sacrificePct={data.sacrificePct}
                  sacrificeFixed={data.sacrificeFixed}
                  currencySymbol={currency.symbol}
                  onSalaryChange={(v) => updateField('salary', v)}
                  onPeriodChange={(v) => updateField('period', v)}
                  onRegionChange={(v) => updateField('region', v)}
                  onSalarySacrificeChange={(v) => updateField('salarySacrifice', v)}
                  onSacrificePctChange={(v) => updateField('sacrificePct', v)}
                  onSacrificeFixedChange={(v) => updateField('sacrificeFixed', v)}
                />
              )}

              {data.householdMode && activePartner === 2 && (
                <PartnerInputFields
                  salary={data.partner2Salary}
                  period={data.partner2Period}
                  region={data.partner2Region}
                  salarySacrifice={data.partner2SalarySacrifice}
                  sacrificePct={data.partner2SacrificePct}
                  sacrificeFixed={data.partner2SacrificeFixed}
                  currencySymbol={currency.symbol}
                  onSalaryChange={(v) => updateField('partner2Salary', v)}
                  onPeriodChange={(v) => updateField('partner2Period', v)}
                  onRegionChange={(v) => updateField('partner2Region', v)}
                  onSalarySacrificeChange={(v) => updateField('partner2SalarySacrifice', v)}
                  onSacrificePctChange={(v) => updateField('partner2SacrificePct', v)}
                  onSacrificeFixedChange={(v) => updateField('partner2SacrificeFixed', v)}
                />
              )}
            </div>

            {/* Breakdown — collapsible, below input card */}
            <div className="ps-card thp-breakdown-card">
              <button className="thp-breakdown-toggle" onClick={() => setShowBreakdown(!showBreakdown)}>
                <span>Tax &amp; NI Breakdown</span>
                <span className={`thp-breakdown-chevron ${showBreakdown ? 'thp-breakdown-chevron--open' : ''}`}>▼</span>
              </button>

              {showBreakdown && (
                <>
                  {data.householdMode && result2 && (
                    <div className="thp-breakdown-partner-tabs">
                      <button
                        className={`thp-bd-tab ${breakdownPartner === 1 ? 'thp-bd-tab--active' : ''}`}
                        onClick={() => setBreakdownPartner(1)}
                      >
                        {data.partner1Name}
                      </button>
                      <button
                        className={`thp-bd-tab ${breakdownPartner === 2 ? 'thp-bd-tab--active' : ''}`}
                        onClick={() => setBreakdownPartner(2)}
                      >
                        {data.partner2Name}
                      </button>
                    </div>
                  )}
                  <BreakdownContent
                    result={data.householdMode ? breakdownResult : result}
                    region={data.householdMode ? breakdownRegion : data.region}
                    currencyCode={currency.code}
                  />
                </>
              )}
            </div>
          </div>

          {/* Result card */}
          <div className="ps-card thp-result-card">
            {data.householdMode && result2 ? (
              <>
                <div className="thp-result-hero">
                  <span className="thp-result-label">Household Monthly Take Home Pay</span>
                  <span className="thp-result-amount">{formatCurrency(householdMonthly, currency.code)}</span>
                  <span className="thp-result-sub">
                    {formatCurrency(householdAnnual, currency.code)}/year · {formatCurrency(householdWeekly, currency.code)}/week
                  </span>
                </div>

                {/* Per-partner summary */}
                <div className="thp-household-partners">
                  <div className="thp-partner-result">
                    <span className="thp-partner-result-name">{data.partner1Name}</span>
                    <span className="thp-partner-result-amount">
                      {formatCurrency(result.netMonthly, currency.code)}
                      <span className="thp-partner-result-period">/mo</span>
                    </span>
                    <span className="thp-partner-result-sub">{formatCurrency(result.netAnnual, currency.code)}/yr</span>
                  </div>
                  <div className="thp-partner-result">
                    <span className="thp-partner-result-name">{data.partner2Name}</span>
                    <span className="thp-partner-result-amount">
                      {formatCurrency(result2.netMonthly, currency.code)}
                      <span className="thp-partner-result-period">/mo</span>
                    </span>
                    <span className="thp-partner-result-sub">{formatCurrency(result2.netAnnual, currency.code)}/yr</span>
                  </div>
                </div>

                {/* Combined KPIs */}
                <div className="thp-kpi-row">
                  <div className="thp-kpi">
                    <span className="thp-kpi-label">Combined Tax</span>
                    <span className="thp-kpi-value thp-kpi-value--tax">{formatCurrency(result.incomeTax + result2.incomeTax, currency.code)}</span>
                  </div>
                  <div className="thp-kpi">
                    <span className="thp-kpi-label">Combined NI</span>
                    <span className="thp-kpi-value thp-kpi-value--ni">{formatCurrency(result.nationalInsurance + result2.nationalInsurance, currency.code)}</span>
                  </div>
                  <div className="thp-kpi">
                    <span className="thp-kpi-label">Avg Effective Rate</span>
                    <span className="thp-kpi-value">
                      {result.grossAnnual + result2.grossAnnual > 0
                        ? Math.round(((result.incomeTax + result2.incomeTax + result.nationalInsurance + result2.nationalInsurance) / (result.grossAnnual + result2.grossAnnual)) * 1000) / 10
                        : 0}%
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}

            {/* Action buttons */}
            <div className="thp-actions">
              <button className="thp-cta" onClick={handleSeeHowMuch}>
                 See how much you can save →
              </button>
              <button
                className="thp-export-btn"
                onClick={() => {
                  if (data.householdMode && result2) {
                    gate(() => {
                      const dataUrl = exportHouseholdTakeHomePdf(result, result2, data.partner1Name, data.partner2Name, data.region, data.partner2Region, currency.symbol, true);
                      downloadDataUrlMobileSafe(dataUrl, 'household-take-home-pay-report.pdf');
                      addReport({
                        name: `Household Take Home – ${data.partner1Name} & ${data.partner2Name}`,
                        category: 'take-home-pay',
                        dataUrl,
                        summary: `Combined: ${formatCurrency(result.netMonthly + result2.netMonthly, currency.code)}/mo`,
                      });
                    });
                  } else {
                    gate(() => {
                      const dataUrl = exportTakeHomePdf(result, data.region, currency.symbol, true);
                      downloadDataUrlMobileSafe(dataUrl, 'take-home-pay-report.pdf');
                      addReport({
                        name: `Take Home Pay – ${formatCurrency(result.grossAnnual, currency.code)}/yr`,
                        category: 'take-home-pay',
                        dataUrl,
                        summary: `Net: ${formatCurrency(result.netMonthly, currency.code)}/mo · ${data.region}`,
                      });
                    });
                  }
                }}
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
