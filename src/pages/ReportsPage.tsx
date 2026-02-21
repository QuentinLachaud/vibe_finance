import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../state/AuthContext';
import { useCurrency } from '../state/CurrencyContext';
import { formatCurrency } from '../utils/currency';
import {
  runSimulation,
  formatMonth,
  type CashFlow,
  type SimulationResult,
} from '../utils/simulationEngine';
import { LoginModal } from '../components/LoginModal';
import type { SavedScenario, CurrencyCode } from '../types';
import { loadScenarios } from '../services/scenarioService';

// ── Types ──

interface ScenarioReport {
  scenario: SavedScenario;
  result: SimulationResult;
}

type ReportFormat = 'html' | 'csv' | 'pdf';

// ── Helpers ──

function describeType(t: CashFlow['type']): string {
  switch (t) {
    case 'one-off': return 'One-off';
    case 'recurring-deposit': return 'Deposit';
    case 'recurring-withdrawal': return 'Withdrawal';
    default: return t;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Report generators ──

function generateCSV(reports: ScenarioReport[], _code: CurrencyCode): string {
  const lines: string[] = [];

  for (const { scenario, result } of reports) {
    lines.push(`Scenario: ${scenario.name}`);
    lines.push(`Starting Balance,${scenario.startingBalance}`);
    lines.push(`Simulation End,${scenario.simulationEnd}`);
    lines.push('');

    // Cash flows table
    lines.push('Cash Flows');
    lines.push('Label,Type,Amount,Growth %,Start,End,Frequency');
    for (const cf of scenario.cashFlows) {
      lines.push(
        [
          `"${cf.label}"`,
          describeType(cf.type),
          cf.amount,
          cf.growthRate,
          cf.startDate,
          cf.endDate || '',
          cf.frequency || '',
        ].join(','),
      );
    }
    lines.push('');

    // Results summary
    lines.push('Results Summary');
    lines.push(`Median (Expected),${result.finalMedian}`);
    lines.push(`Optimistic (75th),${result.finalP75}`);
    lines.push(`Pessimistic (25th),${result.finalP25}`);
    lines.push(`Best Case (90th),${result.finalP90}`);
    lines.push(`Worst Case (10th),${result.finalP10}`);
    lines.push(`Survival Rate,${result.survivalRate}%`);
    lines.push('');

    // Time series
    lines.push('Time Series');
    lines.push('Period,10th,25th,Median,75th,90th');
    for (const ts of result.timeSteps) {
      lines.push(`${ts.label},${ts.p10},${ts.p25},${ts.median},${ts.p75},${ts.p90}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

function generateHTML(reports: ScenarioReport[], code: CurrencyCode): string {
  const fmt = (v: number) => formatCurrency(v, code);
  const now = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

  let scenarioBlocks = '';

  for (const { scenario, result } of reports) {
    const cfRows = scenario.cashFlows
      .map(
        (cf) => `
        <tr>
          <td>${cf.label || '—'}</td>
          <td>${describeType(cf.type)}</td>
          <td class="num">${fmt(cf.amount)}</td>
          <td class="num">${cf.growthRate}%</td>
          <td>${formatMonth(cf.startDate)}</td>
          <td>${cf.endDate ? formatMonth(cf.endDate) : '—'}</td>
          <td>${cf.frequency === 'annually' ? 'Annually' : cf.frequency === 'monthly' ? 'Monthly' : '—'}</td>
        </tr>`,
      )
      .join('');

    const tsRows = result.timeSteps
      .map(
        (ts) => `
        <tr>
          <td>${ts.label}</td>
          <td class="num">${fmt(ts.p10)}</td>
          <td class="num">${fmt(ts.p25)}</td>
          <td class="num highlight">${fmt(ts.median)}</td>
          <td class="num">${fmt(ts.p75)}</td>
          <td class="num">${fmt(ts.p90)}</td>
        </tr>`,
      )
      .join('');

    scenarioBlocks += `
      <section class="scenario-block">
        <h2>${scenario.name}</h2>

        <div class="meta-row">
          <div class="meta"><span class="meta-label">Starting Balance</span><span class="meta-value">${fmt(scenario.startingBalance)}</span></div>
          <div class="meta"><span class="meta-label">Horizon</span><span class="meta-value">${scenario.simulationEnd ? formatMonth(scenario.simulationEnd) : 'Auto'}</span></div>
        </div>

        <h3>Cash Flows</h3>
        <table>
          <thead>
            <tr><th>Label</th><th>Type</th><th>Amount</th><th>Growth</th><th>Start</th><th>End</th><th>Frequency</th></tr>
          </thead>
          <tbody>${cfRows}</tbody>
        </table>

        <h3>Results Summary</h3>
        <div class="results-grid">
          <div class="result-card accent">
            <div class="result-label">Median (Expected)</div>
            <div class="result-value">${fmt(result.finalMedian)}</div>
          </div>
          <div class="result-card">
            <div class="result-label">Optimistic (75th)</div>
            <div class="result-value">${fmt(result.finalP75)}</div>
          </div>
          <div class="result-card">
            <div class="result-label">Pessimistic (25th)</div>
            <div class="result-value">${fmt(result.finalP25)}</div>
          </div>
          <div class="result-card">
            <div class="result-label">Best Case (90th)</div>
            <div class="result-value">${fmt(result.finalP90)}</div>
          </div>
          <div class="result-card">
            <div class="result-label">Worst Case (10th)</div>
            <div class="result-value">${fmt(result.finalP10)}</div>
          </div>
          <div class="result-card">
            <div class="result-label">Survival Rate</div>
            <div class="result-value">${result.survivalRate}%</div>
          </div>
        </div>

        <h3>Projected Values Over Time</h3>
        <table class="ts-table">
          <thead>
            <tr><th>Period</th><th>10th</th><th>25th</th><th>Median</th><th>75th</th><th>90th</th></tr>
          </thead>
          <tbody>${tsRows}</tbody>
        </table>
      </section>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Portfolio Simulation Report — Vibe Finance</title>
<style>
  :root { --brand: #8b5cf6; --brand-dark: #6d28d9; --bg: #0e0e12; --surface: #18181f; --border: #2a2a35; --text: #e4e4e7; --text-sec: #a1a1aa; --text-muted: #71717a; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; padding: 0; }

  .report-header { background: linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%); padding: 40px 48px; }
  .report-header h1 { font-size: 28px; font-weight: 700; color: #fff; }
  .report-header .date { font-size: 13px; color: rgba(255,255,255,0.7); margin-top: 4px; }
  .report-header .brand { font-size: 14px; color: rgba(255,255,255,0.5); margin-top: 12px; letter-spacing: 1px; text-transform: uppercase; }

  .content { max-width: 900px; margin: 0 auto; padding: 32px 24px 64px; }

  .scenario-block { margin-bottom: 48px; padding-bottom: 32px; border-bottom: 1px solid var(--border); }
  .scenario-block h2 { font-size: 22px; font-weight: 700; margin-bottom: 16px; color: var(--brand); }
  .scenario-block h3 { font-size: 15px; font-weight: 600; margin: 20px 0 10px; color: var(--text-sec); text-transform: uppercase; letter-spacing: 0.5px; }

  .meta-row { display: flex; gap: 24px; margin-bottom: 8px; }
  .meta { display: flex; flex-direction: column; gap: 2px; }
  .meta-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .meta-value { font-size: 18px; font-weight: 700; color: var(--text); }

  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead { background: var(--surface); }
  th { padding: 8px 12px; text-align: left; color: var(--text-sec); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); }
  td { padding: 8px 12px; border-bottom: 1px solid var(--border); color: var(--text); }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.highlight { color: var(--brand); font-weight: 600; }
  tr:last-child td { border-bottom: none; }

  .results-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .result-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px; text-align: center; }
  .result-card.accent { border-color: var(--brand); background: rgba(139,92,246,0.08); }
  .result-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .result-value { font-size: 20px; font-weight: 700; color: var(--text); }
  .result-card.accent .result-value { color: var(--brand); }

  .ts-table { margin-top: 8px; }
  .ts-table thead th:first-child { min-width: 100px; }

  .report-footer { text-align: center; padding: 24px; font-size: 12px; color: var(--text-muted); border-top: 1px solid var(--border); margin-top: 32px; }

  @media print {
    body { background: #fff; color: #111; }
    :root { --surface: #f9f9f9; --border: #ddd; --text: #111; --text-sec: #555; --text-muted: #888; --brand: #6d28d9; }
    .report-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .result-card { break-inside: avoid; }
    .scenario-block { break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="report-header">
    <div class="brand">Vibe Finance</div>
    <h1>Portfolio Simulation Report</h1>
    <div class="date">Generated on ${now}</div>
  </div>
  <div class="content">
    ${scenarioBlocks}
  </div>
  <div class="report-footer">
    Generated by Vibe Finance &middot; Monte Carlo Portfolio Simulator
  </div>
</body>
</html>`;
}

// ── Component ──

export function ReportsPage() {
  const { user } = useAuth();
  const { currency } = useCurrency();

  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showFormatPicker, setShowFormatPicker] = useState(false);

  // Load scenarios once on auth
  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoadingScenarios(true);
    try {
      const data = await loadScenarios(user.uid);
      setScenarios(data);
      setLoaded(true);
    } catch (e) {
      console.error('Failed to load scenarios', e);
    }
    setLoadingScenarios(false);
  }, [user]);

  // Auto-load on mount
  useState(() => {
    if (user && !loaded) loadAll();
  });

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selected.size === scenarios.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(scenarios.map((s) => s.id)));
    }
  }, [selected.size, scenarios]);

  const selectedScenarios = useMemo(
    () => scenarios.filter((s) => selected.has(s.id)),
    [scenarios, selected],
  );

  const runReportsForSelected = useCallback(
    (format: ReportFormat) => {
      if (!selectedScenarios.length) return;
      setGenerating(true);
      setShowFormatPicker(false);

      // Run simulations for each selected scenario
      setTimeout(() => {
        try {
          const reports: ScenarioReport[] = selectedScenarios.map((sc) => ({
            scenario: sc,
            result: runSimulation({
              startingBalance: sc.startingBalance,
              cashFlows: sc.cashFlows,
              volatility: 12,
              numPaths: 500,
              endOverride: sc.simulationEnd || undefined,
            }),
          }));

          const timestamp = new Date().toISOString().slice(0, 10);

          if (format === 'csv') {
            const csv = generateCSV(reports, currency.code);
            downloadBlob(new Blob([csv], { type: 'text/csv' }), `vibe-finance-report-${timestamp}.csv`);
          } else if (format === 'html') {
            const html = generateHTML(reports, currency.code);
            downloadBlob(new Blob([html], { type: 'text/html' }), `vibe-finance-report-${timestamp}.html`);
          } else if (format === 'pdf') {
            // Open HTML in new window for print-to-PDF
            const html = generateHTML(reports, currency.code);
            const win = window.open('', '_blank');
            if (win) {
              win.document.write(html);
              win.document.close();
              // Slight delay to let styles load
              setTimeout(() => win.print(), 500);
            }
          }
        } catch (e) {
          console.error('Report generation failed', e);
        }
        setGenerating(false);
      }, 50);
    },
    [selectedScenarios, currency.code],
  );

  // ── Render ──

  if (!user) {
    return (
      <div className="page-container">
        <div className="ps-page">
          <h1 className="ps-page-title">Reports</h1>
          <div className="ps-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              Sign in to generate reports from your saved scenarios.
            </p>
            <button className="ps-btn ps-btn--primary" onClick={() => setShowLogin(true)}>
              Sign In
            </button>
          </div>
          {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="ps-page">
        <h1 className="ps-page-title">Reports</h1>

        {/* Scenario selection */}
        <div className="ps-card rp-card">
          <div className="rp-card-header">
            <h2 className="ps-card-title">Select Scenarios</h2>
            {!loaded && (
              <button className="ps-btn ps-btn--secondary" onClick={loadAll} disabled={loadingScenarios}>
                {loadingScenarios ? 'Loading…' : 'Load Scenarios'}
              </button>
            )}
          </div>

          {loaded && scenarios.length === 0 && (
            <p style={{ color: 'var(--text-muted)', padding: '16px 0' }}>
              No saved scenarios found. Go to the Portfolio Simulator to create and save scenarios.
            </p>
          )}

          {loaded && scenarios.length > 0 && (
            <>
              <table className="rp-table">
                <thead>
                  <tr>
                    <th className="rp-th-check">
                      <label className="rp-check-label">
                        <input
                          type="checkbox"
                          checked={selected.size === scenarios.length && scenarios.length > 0}
                          onChange={toggleAll}
                        />
                      </label>
                    </th>
                    <th>Scenario</th>
                    <th>Starting Balance</th>
                    <th>Cash Flows</th>
                    <th>Horizon</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((s) => (
                    <tr key={s.id} className={selected.has(s.id) ? 'rp-row-selected' : ''}>
                      <td className="rp-td-check">
                        <label className="rp-check-label">
                          <input
                            type="checkbox"
                            checked={selected.has(s.id)}
                            onChange={() => toggleSelect(s.id)}
                          />
                        </label>
                      </td>
                      <td className="rp-td-name">{s.name}</td>
                      <td className="rp-td-num">{formatCurrency(s.startingBalance, currency.code)}</td>
                      <td className="rp-td-num">{s.cashFlows.length}</td>
                      <td>{s.simulationEnd ? formatMonth(s.simulationEnd) : 'Auto'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="rp-actions">
                <span className="rp-selected-count">{selected.size} selected</span>
                <button
                  className="ps-btn ps-btn--primary"
                  disabled={selected.size === 0 || generating}
                  onClick={() => setShowFormatPicker(true)}
                >
                  {generating ? 'Generating…' : 'Generate Report'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Format picker modal */}
        {showFormatPicker && (
          <div className="ps-modal-backdrop" onClick={() => setShowFormatPicker(false)}>
            <div className="rp-format-picker" onClick={(e) => e.stopPropagation()}>
              <h3 className="rp-format-title">Choose Report Format</h3>
              <div className="rp-format-options">
                <button className="rp-format-btn" onClick={() => runReportsForSelected('html')}>
                  <span className="rp-format-icon">🌐</span>
                  <span className="rp-format-label">HTML</span>
                  <span className="rp-format-desc">Rich styled report, viewable in any browser</span>
                </button>
                <button className="rp-format-btn" onClick={() => runReportsForSelected('pdf')}>
                  <span className="rp-format-icon">📄</span>
                  <span className="rp-format-label">PDF</span>
                  <span className="rp-format-desc">Print-ready via browser print dialog</span>
                </button>
                <button className="rp-format-btn" onClick={() => runReportsForSelected('csv')}>
                  <span className="rp-format-icon">📊</span>
                  <span className="rp-format-label">CSV</span>
                  <span className="rp-format-desc">Opens in Excel, Google Sheets, etc.</span>
                </button>
              </div>
              <button className="rp-format-cancel" onClick={() => setShowFormatPicker(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </div>
    </div>
  );
}
