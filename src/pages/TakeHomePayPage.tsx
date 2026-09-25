import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCurrency } from '../state/CurrencyContext';
import { useCalculator } from '../state/CalculatorContext';
import { formatCurrency } from '../utils/currency';
import { exportTakeHomePdf, exportHouseholdTakeHomePdf } from '../utils/exportPdf';
import { downloadBlobMobileSafe, downloadDataUrlMobileSafe, printHtmlReport } from '../utils/downloadFile';
import { usePersistedState } from '../hooks/usePersistedState';
import { useSavedReports } from '../hooks/useSavedReports';
import { useAuthGate } from '../hooks/useAuthGate';
import { LoginModal } from '../components/LoginModal';
import { LoadingCoin } from '../components/LoadingCoin';
import { ReportGenerateButton, ReportFormatPicker, type ReportFormat } from '../components/ReportFormatPicker';
import { createReportHtml, escapeReportHtml } from '../utils/reportHtml';
import type { CurrencyCode } from '../types';
import {
  annualiseSalary,
  calculateTakeHome,
  type Region,
  type SalaryPeriod,
  type TaxBreakdown,
} from '../utils/takeHomeTax';


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
  salary: 0,
  period: 'annual',
  region: 'england',
  salarySacrifice: false,
  sacrificePct: 0,
  sacrificeFixed: 0,
  partner1Name: 'Partner 1',
  partner2Name: 'Partner 2',
  partner2Salary: 0,
  partner2Period: 'annual',
  partner2Region: 'england',
  partner2SalarySacrifice: false,
  partner2SacrificePct: 0,
  partner2SacrificeFixed: 0,
  lastModified: new Date().toISOString(),
};

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function takeHomeRows(result: TaxBreakdown, currency: CurrencyCode): string {
  const money = (value: number) => formatCurrency(value, currency);
  const rows = [
    ['Gross salary', money(result.grossAnnual)],
    ...(result.pensionSacrifice > 0 ? [['Salary sacrifice', `-${money(result.pensionSacrifice)}`]] : []),
    ['Taxable income', money(result.taxableIncome)],
    ['Income tax', `-${money(result.incomeTax)}`],
    ['National Insurance', `-${money(result.nationalInsurance)}`],
    ['Net annual pay', money(result.netAnnual)],
    ['Net monthly pay', money(result.netMonthly)],
  ];
  return rows.map(([label, value]) => `<tr><td>${escapeReportHtml(label)}</td><td class="num${String(value).startsWith('-') ? ' negative' : ''}">${escapeReportHtml(String(value))}</td></tr>`).join('');
}

function taxBandRows(result: TaxBreakdown, currency: CurrencyCode, bands: 'taxBands' | 'niBands'): string {
  return result[bands].map((band) => `<tr><td>${escapeReportHtml(band.name)}</td><td>${escapeReportHtml(band.rate)}</td><td class="num">${formatCurrency(band.amount, currency)}</td></tr>`).join('');
}

function generateTakeHomeHTML(data: TakeHomePayData, result: TaxBreakdown, result2: TaxBreakdown | null, currency: CurrencyCode): string {
  const household = data.householdMode && result2;
  const monthly = household ? result.netMonthly + result2.netMonthly : result.netMonthly;
  const title = household ? 'Household Take Home Pay Report' : 'Take Home Pay Report';
  const people = household ? [[data.partner1Name, data.region, result], [data.partner2Name, data.partner2Region, result2]] as const : [['Your pay', data.region, result]] as const;
  const summaries = people.map(([name, region, person]) => `<section><h2>${escapeReportHtml(name)} · ${region === 'scotland' ? 'Scotland' : 'England / Wales / NI'}</h2><table><thead><tr><th>Item</th><th class="num">Annual / monthly amount</th></tr></thead><tbody>${takeHomeRows(person, currency)}</tbody></table></section><section><h2>${escapeReportHtml(name)} · Income Tax</h2><table><thead><tr><th>Band</th><th>Rate</th><th class="num">Tax</th></tr></thead><tbody>${taxBandRows(person, currency, 'taxBands')}</tbody></table></section><section><h2>${escapeReportHtml(name)} · National Insurance</h2><table><thead><tr><th>Band</th><th>Rate</th><th class="num">NI</th></tr></thead><tbody>${taxBandRows(person, currency, 'niBands')}</tbody></table></section>`).join('');
  return createReportHtml(title, `${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · UK Tax Year 2025-26`, `<div class="hero"><div class="metric-label">${household ? 'Combined monthly take home pay' : 'Monthly take home pay'}</div><div class="metric-value">${formatCurrency(monthly, currency)}</div></div>${summaries}`);
}

function generateTakeHomeCSV(data: TakeHomePayData, result: TaxBreakdown, result2: TaxBreakdown | null): string {
  const people = data.householdMode && result2 ? [[data.partner1Name, data.region, result], [data.partner2Name, data.partner2Region, result2]] as const : [['Your pay', data.region, result]] as const;
  const lines = ['Take Home Pay Report', `Generated,${new Date().toLocaleDateString('en-GB')}`, ''];
  people.forEach(([name, region, person]) => {
    lines.push(`${name} (${region === 'scotland' ? 'Scotland' : 'England / Wales / NI'})`, 'Item,Amount');
    [['Gross salary', person.grossAnnual], ['Salary sacrifice', person.pensionSacrifice], ['Taxable income', person.taxableIncome], ['Income tax', -person.incomeTax], ['National Insurance', -person.nationalInsurance], ['Net annual pay', person.netAnnual], ['Net monthly pay', person.netMonthly]].forEach(([label, value]) => lines.push(`${csvCell(label)},${value}`));
    lines.push('', 'Income Tax Bands', 'Band,Rate,Amount'); person.taxBands.forEach((band) => lines.push(`${csvCell(band.name)},${csvCell(band.rate)},${band.amount}`));
    lines.push('', 'National Insurance Bands', 'Band,Rate,Amount'); person.niBands.forEach((band) => lines.push(`${csvCell(band.name)},${csvCell(band.rate)},${band.amount}`)); lines.push('');
  });
  return lines.join('\n');
}

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
            placeholder="e.g. 35,000"
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

      {/* Region stays secondary to salary, but is always visible. */}
      <div className="thp-row thp-row--region">
        <label className="thp-label">Tax region</label>
        <div className="thp-region-toggle">
          <button
            className={`thp-region-btn ${region === 'england' ? 'thp-region-btn--active' : ''}`}
            onClick={() => onRegionChange('england')}
          >
            England
          </button>
          <button
            className={`thp-region-btn ${region === 'scotland' ? 'thp-region-btn--active' : ''}`}
            onClick={() => onRegionChange('scotland')}
          >
            Scotland
          </button>
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

export function TakeHomePayPage({ initialSalary }: { initialSalary?: number } = {}) {
  useDocumentTitle('Take Home Pay Calculator | TakeHomeCalc');
  const { currency } = useCurrency();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { dispatch } = useCalculator();

  const [rawData, setData] = usePersistedState<TakeHomePayData>('vf-take-home-pay', THP_DEFAULTS);
  const data = useMemo(() => ({ ...THP_DEFAULTS, ...rawData }), [rawData]);

  // Pre-fill salary for SEO salary landing pages
  useEffect(() => {
    if (initialSalary !== undefined) {
      setData((prev) => ({ ...THP_DEFAULTS, ...prev, salary: initialSalary, period: 'annual' }));
    }
  }, [initialSalary, setData]);

  const [showBreakdown, setShowBreakdown] = useState(false);
  const [activePartner, setActivePartner] = useState<1 | 2>(1);
  const [breakdownPartner, setBreakdownPartner] = useState<1 | 2>(1);
  const didApplySearchParams = useRef(false);
  const { gate, showLogin, onLoginSuccess, onLoginClose } = useAuthGate();
  const { addReport } = useSavedReports();
  const [showReportPicker, setShowReportPicker] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

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

  const handleGenerateReport = useCallback((format: ReportFormat) => {
    setGeneratingReport(true);
    setShowReportPicker(false);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const household = data.householdMode && result2;
      const reportName = household ? `Household Take Home – ${data.partner1Name} & ${data.partner2Name}` : `Take Home Pay – ${formatCurrency(result.grossAnnual, currency.code)}/yr`;
      const html = generateTakeHomeHTML(data, result, result2, currency.code);
      if (format === 'html') downloadBlobMobileSafe(new Blob([html], { type: 'text/html' }), `take-home-pay-report-${timestamp}.html`);
      else if (format === 'pdf') printHtmlReport(html);
      else if (format === 'csv') downloadBlobMobileSafe(new Blob([generateTakeHomeCSV(data, result, result2)], { type: 'text/csv' }), `take-home-pay-report-${timestamp}.csv`);
      else {
        const dataUrl = household && result2
          ? exportHouseholdTakeHomePdf(result, result2, data.partner1Name, data.partner2Name, data.region, data.partner2Region, currency.symbol, true)
          : exportTakeHomePdf(result, data.region, currency.symbol, true);
        downloadDataUrlMobileSafe(dataUrl, `${household ? 'household-' : ''}take-home-pay-report-${timestamp}.pdf`);
        addReport({ name: reportName, category: 'take-home-pay', dataUrl, summary: household ? `Combined: ${formatCurrency(result.netMonthly + result2!.netMonthly, currency.code)}/mo` : `Net: ${formatCurrency(result.netMonthly, currency.code)}/mo · ${data.region}` });
      }
    } catch (error) { console.error('Take home report generation failed', error); }
    setGeneratingReport(false);
  }, [addReport, currency.code, currency.symbol, data, result, result2]);

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
                Individual
              </button>
              <button
                className={`thp-mode-btn ${data.householdMode ? 'thp-mode-btn--active' : ''}`}
                onClick={() => updateField('householdMode', true)}
              >
                Household
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
              <ReportGenerateButton
                label={`Generate ${data.householdMode ? 'Household Take Home' : 'Take Home'} Report`}
                disabled={generatingReport}
                onClick={() => setShowReportPicker(true)}
              />
            </div>
          </div>
        </div>
      </div>
      {showReportPicker && <ReportFormatPicker onSelect={(format) => gate(() => handleGenerateReport(format))} onCancel={() => setShowReportPicker(false)} />}
      {generatingReport && <div className="report-overlay"><LoadingCoin text="Generating report…" /></div>}
    </div>
  );
}
