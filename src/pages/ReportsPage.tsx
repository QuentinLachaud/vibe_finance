import { useState, useCallback, useMemo, useEffect } from 'react';
import { useCurrency } from '../state/CurrencyContext';
import { formatCurrency } from '../utils/currency';
import {
  runSimulation,
  formatMonth,
  parseYM,
  type CashFlow,
  type SimulationResult,
} from '../utils/simulationEngine';
import { LoadingCoin } from '../components/LoadingCoin';
import { ConfirmDialog } from '../components/calculator/ConfirmDialog';
import { TrashIcon } from '../components/Icons';
import type { SavedScenario, CurrencyCode, ReportCategory } from '../types';
import { usePersistedState } from '../hooks/usePersistedState';
import { useSavedReports } from '../hooks/useSavedReports';

// ── Types ──

interface ScenarioReport {
  scenario: SavedScenario;
  result: SimulationResult;
}

type ReportFormat = 'html' | 'csv' | 'pdf';

// ── Constants (defaults — overridden by persisted user settings) ──

const DEFAULT_NUM_PATHS = 500;
const DEFAULT_VOLATILITY = 15;

const COLOR_VIOLET = '#8b5cf6';
const COLOR_EMERALD = '#10b981';
const COLOR_CYAN = '#22d3ee';

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
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) {
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return;
  }

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Compute the span in years and months between two YYYY-MM strings. */
function computeSpan(startDate: string, endDate: string): { years: number; months: number } {
  const s = parseYM(startDate);
  const e = parseYM(endDate);
  const totalMonths = (e.year - s.year) * 12 + (e.month - s.month);
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 };
}

function spanText(y: number, m: number): string {
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} year${y !== 1 ? 's' : ''}`);
  if (m > 0) parts.push(`${m} month${m !== 1 ? 's' : ''}`);
  return parts.join(', ') || '0 months';
}

function buildHistogramBins(values: number[], numBins = 30): { lo: number; hi: number; count: number }[] {
  if (!values.length) return [];
  const min = values[0];
  const max = values[values.length - 1];
  if (min === max) return [{ lo: min, hi: max, count: values.length }];
  const bw = (max - min) / numBins;
  const bins = Array.from({ length: numBins }, (_, i) => ({ lo: min + i * bw, hi: min + (i + 1) * bw, count: 0 }));
  for (const v of values) { let i = Math.min(Math.floor((v - min) / bw), numBins - 1); if (i < 0) i = 0; bins[i].count++; }
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

// ── Qualitative narrative helpers ──

function portfolioNarrative(sc: SavedScenario, result: SimulationResult, fmt: (n: number) => string, simVolatility: number, simPaths: number): string {
  const deposits = sc.cashFlows.filter(cf => cf.type === 'recurring-deposit' && cf.enabled);
  const withdrawals = sc.cashFlows.filter(cf => cf.type === 'recurring-withdrawal' && cf.enabled);
  const oneOffs = sc.cashFlows.filter(cf => cf.type === 'one-off' && cf.enabled);

  const firstStart = sc.cashFlows.filter(cf => cf.enabled).map(cf => cf.startDate).sort()[0] || '';
  const endDate = sc.simulationEnd || '';
  const span = firstStart && endDate ? computeSpan(firstStart, endDate) : null;

  const survived = result.survivalRate;
  const failed = 100 - survived;

  let text = `<p>This scenario begins with a portfolio valued at <strong>${fmt(sc.startingBalance)}</strong>`;
  if (span) text += ` and spans <strong>${spanText(span.years, span.months)}</strong>`;
  text += '.</p>';

  // Accumulation phase
  if (deposits.length > 0 || oneOffs.length > 0) {
    text += `<p class="narrative-section"><strong>Accumulation</strong> — `;
    const parts: string[] = [];
    for (const d of deposits) {
      parts.push(`a ${d.frequency || 'monthly'} deposit of ${fmt(d.amount)} ("${d.label || 'Unnamed'}")`);
    }
    for (const o of oneOffs) {
      if (o.amount > 0) parts.push(`a one-off injection of ${fmt(o.amount)} in ${formatMonth(o.startDate)}`);
    }
    text += parts.length ? `The plan includes ${parts.join('; ')}.` : 'No regular contributions are scheduled.';
    text += '</p>';
  }

  // Withdrawal / decumulation
  if (withdrawals.length > 0) {
    text += `<p class="narrative-section"><strong>Decumulation</strong> — `;
    const parts: string[] = [];
    for (const w of withdrawals) {
      parts.push(`a ${w.frequency || 'monthly'} withdrawal of ${fmt(w.amount)} ("${w.label || 'Unnamed'}")`);
    }
    text += parts.join('; ') + '.</p>';
  }

  // Growth
  const avgGrowth = sc.cashFlows.filter(cf => cf.enabled).reduce((s, cf) => s + cf.growthRate, 0) / Math.max(1, sc.cashFlows.filter(cf => cf.enabled).length);
  text += `<p class="narrative-section"><strong>Growth Assumption</strong> — Cash flows assume a weighted-average annual growth rate of approximately <strong>${avgGrowth.toFixed(1)}%</strong>, with annual volatility of <strong>${simVolatility}%</strong>.</p>`;

  // Simulation
  text += `<p class="narrative-section"><strong>Simulation</strong> — ${simPaths.toLocaleString()} independent Monte Carlo paths were modelled. `;
  if (survived === 100) {
    text += 'All simulated paths survived with a positive balance at the end of the horizon.';
  } else if (failed <= 5) {
    text += `${survived}% of paths survived (${failed}% ran to zero before the end).`;
  } else {
    text += `Only <strong>${survived}%</strong> of paths survived — <strong>${failed}%</strong> depleted the portfolio before the horizon ended. Consider reducing withdrawals or extending the growth period.`;
  }
  text += '</p>';

  return text;
}

// ── SVG Chart builders (inline in HTML, no JS needed) ──

function buildMonteCarloSVG(result: SimulationResult, _fmt: (n: number) => string): string {
  const ts = result.timeSteps;
  if (ts.length < 2) return '';

  const W = 760, H = 300, PAD_L = 70, PAD_R = 20, PAD_T = 20, PAD_B = 40;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const maxV = Math.max(...ts.map(t => t.p90)) || 1;
  const minV = Math.min(0, ...ts.map(t => t.p10));
  const range = maxV - minV || 1;

  const x = (i: number) => PAD_L + (i / (ts.length - 1)) * chartW;
  const y = (v: number) => PAD_T + chartH - ((v - minV) / range) * chartH;

  const pathStr = (key: keyof typeof ts[0]) =>
    ts.map((t, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(t[key] as number).toFixed(1)}`).join(' ');

  // Band: p10–p90
  const bandOuter = ts.map((t, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(t.p90).toFixed(1)}`).join(' ')
    + ' ' + [...ts].reverse().map((t, i) => `L${x(ts.length - 1 - i).toFixed(1)},${y(t.p10).toFixed(1)}`).join(' ') + ' Z';

  // Band: p25–p75
  const bandInner = ts.map((t, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(t.p75).toFixed(1)}`).join(' ')
    + ' ' + [...ts].reverse().map((t, i) => `L${x(ts.length - 1 - i).toFixed(1)},${y(t.p25).toFixed(1)}`).join(' ') + ' Z';

  // Tick labels
  const labelInterval = Math.max(1, Math.floor(ts.length / 6));
  const xLabels = ts.filter((_, i) => i % labelInterval === 0 || i === ts.length - 1)
    .map(t => {
      const i = ts.indexOf(t);
      return `<text x="${x(i).toFixed(1)}" y="${H - 5}" fill="#71717a" font-size="10" text-anchor="middle">${t.label}</text>`;
    }).join('');

  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = minV + (range * i) / yTicks;
    const label = v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(Math.round(v));
    return `<text x="${PAD_L - 8}" y="${y(v).toFixed(1)}" fill="#71717a" font-size="10" text-anchor="end" dominant-baseline="middle">${label}</text>
    <line x1="${PAD_L}" y1="${y(v).toFixed(1)}" x2="${W - PAD_R}" y2="${y(v).toFixed(1)}" stroke="#2a2a35" stroke-dasharray="3,3"/>`;
  }).join('');

  return `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;margin:12px 0;">
      ${yLabels}
      <path d="${bandOuter}" fill="${COLOR_VIOLET}" fill-opacity="0.18"/>
      <path d="${bandInner}" fill="${COLOR_EMERALD}" fill-opacity="0.22"/>
      <path d="${pathStr('median')}" fill="none" stroke="${COLOR_CYAN}" stroke-width="2.5"/>
      ${xLabels}
      <!-- Legend -->
      <rect x="${PAD_L}" y="${PAD_T - 14}" width="10" height="10" rx="2" fill="${COLOR_VIOLET}" fill-opacity="0.35"/>
      <text x="${PAD_L + 14}" y="${PAD_T - 5}" fill="#a1a1aa" font-size="9">10th–90th</text>
      <rect x="${PAD_L + 80}" y="${PAD_T - 14}" width="10" height="10" rx="2" fill="${COLOR_EMERALD}" fill-opacity="0.45"/>
      <text x="${PAD_L + 94}" y="${PAD_T - 5}" fill="#a1a1aa" font-size="9">25th–75th</text>
      <line x1="${PAD_L + 165}" y1="${PAD_T - 9}" x2="${PAD_L + 180}" y2="${PAD_T - 9}" stroke="${COLOR_CYAN}" stroke-width="2"/>
      <text x="${PAD_L + 184}" y="${PAD_T - 5}" fill="#a1a1aa" font-size="9">Median</text>
    </svg>
  `;
}

function buildHistogramSVG(result: SimulationResult, _fmt: (n: number) => string): string {
  const dist = result.finalDistribution;
  if (!dist.length) return '';

  const bins = buildHistogramBins(dist, 30);
  if (!bins.length) return '';

  const W = 760, H = 240, PAD_L = 70, PAD_R = 20, PAD_T = 20, PAD_B = 40;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const maxCount = Math.max(...bins.map(b => b.count)) || 1;
  const barW = chartW / bins.length;
  const p25 = pctile(dist, 25);
  const median = pctile(dist, 50);
  const p75 = pctile(dist, 75);

  const bars = bins.map((b, i) => {
    const bx = PAD_L + i * barW;
    const bh = (b.count / maxCount) * chartH;
    const by = PAD_T + chartH - bh;
    const mid = (b.lo + b.hi) / 2;
    const fill = mid >= p25 && mid <= p75 ? COLOR_EMERALD : COLOR_VIOLET;
    const opacity = mid >= p25 && mid <= p75 ? '0.5' : '0.3';
    return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${Math.max(1, barW - 1).toFixed(1)}" height="${bh.toFixed(1)}" fill="${fill}" fill-opacity="${opacity}" rx="1"/>`;
  }).join('');

  // Reference lines
  const xOfVal = (v: number) => {
    const min = bins[0].lo;
    const max = bins[bins.length - 1].hi;
    return PAD_L + ((v - min) / (max - min)) * chartW;
  };

  const refLines = [
    { v: p25, label: '25th', color: '#eab308' },
    { v: median, label: 'Median', color: COLOR_CYAN },
    { v: p75, label: '75th', color: COLOR_EMERALD },
  ].map(r => {
    const rx = xOfVal(r.v);
    return `<line x1="${rx.toFixed(1)}" y1="${PAD_T}" x2="${rx.toFixed(1)}" y2="${PAD_T + chartH}" stroke="${r.color}" stroke-width="1.5" stroke-dasharray="4,3"/>
    <text x="${rx.toFixed(1)}" y="${PAD_T - 4}" fill="${r.color}" font-size="9" text-anchor="middle">${r.label}</text>`;
  }).join('');

  // X labels
  const labelInterval = Math.max(1, Math.floor(bins.length / 5));
  const xLabels = bins.filter((_, i) => i % labelInterval === 0 || i === bins.length - 1).map((b) => {
    const i = bins.indexOf(b);
    const cx = PAD_L + (i + 0.5) * barW;
    const mid = (b.lo + b.hi) / 2;
    const label = mid >= 1e6 ? `${(mid / 1e6).toFixed(1)}M` : mid >= 1e3 ? `${(mid / 1e3).toFixed(0)}K` : String(Math.round(mid));
    return `<text x="${cx.toFixed(1)}" y="${H - 5}" fill="#71717a" font-size="9" text-anchor="middle">${label}</text>`;
  }).join('');

  return `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;margin:12px 0;">
      <line x1="${PAD_L}" y1="${PAD_T + chartH}" x2="${W - PAD_R}" y2="${PAD_T + chartH}" stroke="#2a2a35"/>
      ${bars}
      ${refLines}
      ${xLabels}
    </svg>
  `;
}

// ── Report generators ──

function generateCSV(reports: ScenarioReport[], _code: CurrencyCode, simPaths: number): string {
  const lines: string[] = [];

  for (const { scenario, result } of reports) {
    lines.push(`Scenario: ${scenario.name}`);
    lines.push(`Starting Balance,${scenario.startingBalance}`);
    lines.push(`Simulation End,${scenario.simulationEnd}`);
    lines.push(`Simulations,${simPaths}`);
    lines.push(`Survival Rate,${result.survivalRate}%`);
    lines.push('');

    lines.push('Cash Flows');
    lines.push('Label,Type,Amount,Growth %,Start,End,Frequency');
    for (const cf of scenario.cashFlows) {
      lines.push([`"${cf.label}"`, describeType(cf.type), cf.amount, cf.growthRate, cf.startDate, cf.endDate || '', cf.frequency || ''].join(','));
    }
    lines.push('');

    lines.push('Results Summary');
    lines.push(`Median (Expected),${result.finalMedian}`);
    lines.push(`Optimistic (75th),${result.finalP75}`);
    lines.push(`Pessimistic (25th),${result.finalP25}`);
    lines.push(`Best Case (90th),${result.finalP90}`);
    lines.push(`Worst Case (10th),${result.finalP10}`);
    lines.push('');

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

function generateHTML(reports: ScenarioReport[], code: CurrencyCode, simVolatility: number, simPaths: number): string {
  const fmt = (v: number) => formatCurrency(v, code);
  const now = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

  let scenarioBlocks = '';

  for (const { scenario, result } of reports) {
    const narrative = portfolioNarrative(scenario, result, fmt, simVolatility, simPaths);

    // Cash flows table
    const cfRows = scenario.cashFlows.filter(cf => cf.enabled).map(cf => `
      <tr>
        <td>${cf.label || '—'}</td>
        <td><span class="tag tag-${cf.type === 'recurring-deposit' ? 'deposit' : cf.type === 'recurring-withdrawal' ? 'withdrawal' : 'oneoff'}">${describeType(cf.type)}</span></td>
        <td class="num">${fmt(cf.amount)}</td>
        <td class="num">${cf.growthRate}%</td>
        <td>${formatMonth(cf.startDate)}</td>
        <td>${cf.endDate ? formatMonth(cf.endDate) : '—'}</td>
        <td>${cf.frequency === 'annually' ? 'Annually' : cf.frequency === 'monthly' ? 'Monthly' : '—'}</td>
      </tr>`).join('');

    // Selected time-series rows (yearly summaries only to avoid overwhelming people)
    const tsRows = result.timeSteps
      .filter((_, i) => i === 0 || i === result.timeSteps.length - 1 || i % Math.max(1, Math.floor(result.timeSteps.length / 8)) === 0)
      .map(ts => `
        <tr>
          <td>${ts.label}</td>
          <td class="num">${fmt(ts.p10)}</td>
          <td class="num">${fmt(ts.p25)}</td>
          <td class="num median-col">${fmt(ts.median)}</td>
          <td class="num">${fmt(ts.p75)}</td>
          <td class="num">${fmt(ts.p90)}</td>
        </tr>`).join('');

    const mcSVG = buildMonteCarloSVG(result, fmt);
    const histSVG = buildHistogramSVG(result, fmt);

    scenarioBlocks += `
      <!-- ═══════════════ SCENARIO ═══════════════ -->
      <section class="scenario-block">
        <div class="scenario-header">
          <h2>${scenario.name}</h2>
        </div>

        <!-- Page 1: Executive Summary -->
        <div class="page-section">
          <div class="section-badge">Overview</div>
          <div class="narrative">${narrative}</div>

          <div class="kpi-row">
            <div class="kpi kpi-accent">
              <div class="kpi-value" style="color:${COLOR_CYAN}">${fmt(result.finalMedian)}</div>
              <div class="kpi-label">Median (Expected)</div>
            </div>
            <div class="kpi">
              <div class="kpi-value" style="color:${COLOR_EMERALD}">${fmt(result.finalP75)}</div>
              <div class="kpi-label">Optimistic (75th)</div>
            </div>
            <div class="kpi">
              <div class="kpi-value" style="color:#eab308">${fmt(result.finalP25)}</div>
              <div class="kpi-label">Pessimistic (25th)</div>
            </div>
          </div>

          <div class="kpi-row kpi-row-secondary">
            <div class="kpi-sm">
              <span class="kpi-sm-label">Starting Value</span>
              <span class="kpi-sm-value">${fmt(scenario.startingBalance)}</span>
            </div>
            <div class="kpi-sm">
              <span class="kpi-sm-label">Simulations</span>
              <span class="kpi-sm-value">${simPaths.toLocaleString()}</span>
            </div>
            <div class="kpi-sm">
              <span class="kpi-sm-label">Survived</span>
              <span class="kpi-sm-value">${result.survivalRate}%</span>
            </div>
            <div class="kpi-sm">
              <span class="kpi-sm-label">Depleted</span>
              <span class="kpi-sm-value">${100 - result.survivalRate}%</span>
            </div>
          </div>
        </div>

        <!-- Page 2: Monte Carlo Chart -->
        <div class="page-section page-break">
          <div class="section-badge">Projected Growth</div>
          <p class="section-explainer">The chart below shows the range of possible portfolio outcomes over time. The shaded bands represent the probability corridors — the wider violet band covers 80% of outcomes (10th to 90th percentile), while the narrower green band covers the middle 50% (25th to 75th). The cyan line marks the median path.</p>
          ${mcSVG}
        </div>

        <!-- Page 3: Distribution Chart -->
        <div class="page-section page-break">
          <div class="section-badge">Outcome Distribution</div>
          <p class="section-explainer">This histogram shows how final portfolio values are distributed across all ${simPaths} simulations. Each bar represents a range of outcomes — taller bars mean more simulations landed in that range. The dashed lines mark key percentiles.</p>
          ${histSVG}
        </div>

        <!-- Page 4: Cash Flows Breakdown -->
        <div class="page-section page-break">
          <div class="section-badge">Cash Flows</div>
          <p class="section-explainer">The table below lists every cash flow included in this scenario. Deposits add to the portfolio, withdrawals draw down from it, and one-off events are single transactions at a specific date.</p>
          <table>
            <thead><tr><th>Label</th><th>Type</th><th>Amount</th><th>Growth</th><th>Start</th><th>End</th><th>Frequency</th></tr></thead>
            <tbody>${cfRows}</tbody>
          </table>
        </div>

        <!-- Page 5: Time Series Data -->
        <div class="page-section page-break">
          <div class="section-badge">Projected Values</div>
          <p class="section-explainer">Key milestone values across the simulation horizon. The <em>Median</em> column (highlighted) represents the most likely outcome at each point in time. Outer columns show optimistic and pessimistic scenarios.</p>
          <table class="ts-table">
            <thead>
              <tr>
                <th>Period</th>
                <th style="color:${COLOR_VIOLET}">10th</th>
                <th style="color:#eab308">25th</th>
                <th style="color:${COLOR_CYAN}">Median</th>
                <th style="color:${COLOR_EMERALD}">75th</th>
                <th style="color:${COLOR_VIOLET}">90th</th>
              </tr>
            </thead>
            <tbody>${tsRows}</tbody>
          </table>
        </div>
      </section>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Portfolio Simulation Report — TakeHomeCalc</title>
<style>
  :root {
    --brand: #8b5cf6; --brand-dark: #6d28d9;
    --bg: #0e0e12; --surface: #151519; --surface-2: #1a1a20;
    --border: #252530; --text: #d4d4d8; --text-sec: #a1a1aa; --text-muted: #71717a;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background: var(--bg); color: var(--text);
    line-height: 1.65; font-size: 14px;
  }

  /* Header */
  .report-header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 36px 48px;
  }
  .report-header .brand {
    font-size: 12px; color: var(--text-muted);
    letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px;
  }
  .report-header h1 { font-size: 24px; font-weight: 700; color: #fff; }
  .report-header .date { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

  .content { max-width: 860px; margin: 0 auto; padding: 36px 28px 72px; }

  /* Scenario blocks */
  .scenario-block { margin-bottom: 56px; }
  .scenario-header { margin-bottom: 24px; border-bottom: 2px solid var(--border); padding-bottom: 12px; }
  .scenario-header h2 { font-size: 20px; font-weight: 700; color: #fff; }

  /* Page sections */
  .page-section { margin-bottom: 36px; }
  .page-break { page-break-before: auto; }
  .section-badge {
    display: inline-block;
    font-size: 10px; font-weight: 700; color: var(--brand);
    text-transform: uppercase; letter-spacing: 1.2px;
    border: 1px solid var(--brand); border-radius: 4px;
    padding: 2px 10px; margin-bottom: 12px;
  }
  .section-explainer {
    font-size: 13px; color: var(--text-sec);
    line-height: 1.7; margin-bottom: 16px;
    max-width: 720px;
  }

  /* Narrative */
  .narrative { margin-bottom: 24px; }
  .narrative p { font-size: 13.5px; color: var(--text-sec); margin-bottom: 10px; line-height: 1.7; }
  .narrative strong { color: #fff; font-weight: 600; }

  /* KPI cards */
  .kpi-row { display: flex; gap: 14px; margin-bottom: 14px; }
  .kpi {
    flex: 1; background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; padding: 18px 16px; text-align: center;
  }
  .kpi-accent { border-color: rgba(34,211,238,0.25); background: rgba(34,211,238,0.04); }
  .kpi-value { font-size: 22px; font-weight: 700; margin-bottom: 2px; }
  .kpi-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

  .kpi-row-secondary { gap: 10px; }
  .kpi-sm {
    flex: 1; background: var(--surface); border: 1px solid var(--border);
    border-radius: 6px; padding: 10px 12px; text-align: center;
    display: flex; flex-direction: column; gap: 2px;
  }
  .kpi-sm-label { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .kpi-sm-value { font-size: 14px; font-weight: 700; color: var(--text); }

  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 4px; }
  thead { background: var(--surface-2); }
  th {
    padding: 8px 10px; text-align: left; color: var(--text-muted);
    font-weight: 600; font-size: 10px; text-transform: uppercase;
    letter-spacing: 0.5px; border-bottom: 1px solid var(--border);
  }
  td { padding: 8px 10px; border-bottom: 1px solid var(--border); color: var(--text); }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.median-col { color: ${COLOR_CYAN}; font-weight: 600; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) { background: rgba(255,255,255,0.015); }

  /* Tags */
  .tag { font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 600; display: inline-block; }
  .tag-deposit { background: rgba(16,185,129,0.12); color: ${COLOR_EMERALD}; }
  .tag-withdrawal { background: rgba(234,179,8,0.12); color: #eab308; }
  .tag-oneoff { background: rgba(139,92,246,0.12); color: ${COLOR_VIOLET}; }

  .ts-table thead th:first-child { min-width: 90px; }

  /* Footer */
  .report-footer {
    text-align: center; padding: 20px; font-size: 11px;
    color: var(--text-muted); border-top: 1px solid var(--border); margin-top: 40px;
  }

  /* Print */
  @media print {
    body { background: #fff; color: #222; font-size: 11pt; }
    :root { --surface: #f7f7f8; --surface-2: #f0f0f2; --border: #ddd; --text: #222; --text-sec: #555; --text-muted: #888; --brand: #6d28d9; --bg: #fff; }
    .report-header { background: var(--surface); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .kpi, .kpi-sm { break-inside: avoid; }
    .page-break { page-break-before: always; }
    .scenario-block { break-inside: avoid; }
    svg { max-width: 100%; }
  }
</style>
</head>
<body>
  <div class="report-header">
    <div class="brand">TakeHomeCalc</div>
    <h1>Portfolio Simulation Report</h1>
    <div class="date">Generated ${now}</div>
  </div>
  <div class="content">
    ${scenarioBlocks}
  </div>
  <div class="report-footer">
    TakeHomeCalc &middot; Monte Carlo Portfolio Simulator &middot; ${reports.length} scenario${reports.length !== 1 ? 's' : ''} &middot; ${simPaths.toLocaleString()} simulations each
  </div>
</body>
</html>`;
}

// ── Helpers: date formatting ──

function formatReportDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const CATEGORY_META: Record<ReportCategory, { label: string; icon: string; emptyText: string }> = {
  'take-home-pay': {
    label: 'Take Home Pay',
    icon: '💰',
    emptyText: 'No take-home pay reports yet. Generate one from the Take Home Pay page.',
  },
  'savings-calculator': {
    label: 'Savings Calculator',
    icon: '🧮',
    emptyText: 'No savings reports yet. Export one from the Savings Calculator.',
  },
  'portfolio-simulation': {
    label: 'Portfolio Simulation',
    icon: '📈',
    emptyText: 'No portfolio reports yet. Select scenarios below to generate.',
  },
  'net-worth': {
    label: 'Net Worth',
    icon: '📊',
    emptyText: 'No net worth reports yet. Export one from the Net Worth page.',
  },
};

// ── Download helpers ──

function downloadDataUrl(dataUrl: string, filename: string) {
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

// ── Component ──

export function ReportsPage() {
  const { currency } = useCurrency();

  // Saved PDF reports (Take Home Pay + Savings Calculator)
  const { reports: savedReports, removeReport, removeReports } = useSavedReports();

  // Live scenarios from Portfolio Simulator
  const [liveScenarios] = usePersistedState<SavedScenario[]>('vf-ps-scenarios', []);
  const [reportScenarios, setReportScenarios] = usePersistedState<SavedScenario[]>('vf-report-scenarios', []);

  const [volatility] = usePersistedState<number>('vf-ps-volatility', DEFAULT_VOLATILITY);
  const [numPaths] = usePersistedState<number>('vf-ps-num-paths', DEFAULT_NUM_PATHS);

  const [psSelected, setPsSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  const [showSavedFormatPicker, setShowSavedFormatPicker] = useState(false);
  const [savedDownloadTarget, setSavedDownloadTarget] = useState<{ name: string; dataUrl: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'saved'; ids: Set<string> } | { type: 'ps'; ids: Set<string> } | null>(null);

  // Selection for saved reports
  const [savedSelected, setSavedSelected] = useState<Set<string>>(new Set());

  // Sync portfolio scenarios
  useEffect(() => {
    setReportScenarios((prev) => {
      const prevById = new Map(prev.map((s) => [s.id, s]));
      let changed = false;
      for (const ls of liveScenarios) {
        const existing = prevById.get(ls.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(ls)) {
          prevById.set(ls.id, ls);
          changed = true;
        }
      }
      return changed ? Array.from(prevById.values()) : prev;
    });
  }, [liveScenarios, setReportScenarios]);

  const scenarios = reportScenarios;

  // Portfolio simulator selection helpers
  const togglePsSelect = useCallback((id: string) => {
    setPsSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const togglePsAll = useCallback(() => {
    if (psSelected.size === scenarios.length) setPsSelected(new Set());
    else setPsSelected(new Set(scenarios.map((s) => s.id)));
  }, [psSelected.size, scenarios]);

  const handlePsDelete = useCallback(() => {
    if (!deleteTarget || deleteTarget.type !== 'ps') return;
    setReportScenarios((prev) => prev.filter((s) => !deleteTarget.ids.has(s.id)));
    setPsSelected(new Set());
    setDeleteTarget(null);
    setShowDeleteConfirm(false);
  }, [deleteTarget, setReportScenarios]);

  const handleSavedDelete = useCallback(() => {
    if (!deleteTarget || deleteTarget.type !== 'saved') return;
    removeReports(deleteTarget.ids);
    setSavedSelected(new Set());
    setDeleteTarget(null);
    setShowDeleteConfirm(false);
  }, [deleteTarget, removeReports]);

  const selectedScenarios = useMemo(
    () => scenarios.filter((s) => psSelected.has(s.id)),
    [scenarios, psSelected],
  );

  const runReportsForSelected = useCallback(
    (format: ReportFormat) => {
      if (!selectedScenarios.length) return;
      setGenerating(true);
      setShowFormatPicker(false);

      setTimeout(() => {
        try {
          const reports: ScenarioReport[] = selectedScenarios.map((sc) => ({
            scenario: sc,
            result: runSimulation({
              startingBalance: sc.startingBalance,
              cashFlows: sc.cashFlows,
              volatility,
              numPaths,
              endOverride: sc.simulationEnd || undefined,
            }),
          }));

          const timestamp = new Date().toISOString().slice(0, 10);

          if (format === 'csv') {
            downloadBlob(new Blob([generateCSV(reports, currency.code, numPaths)], { type: 'text/csv' }), `takehomecalc-report-${timestamp}.csv`);
          } else if (format === 'html') {
            downloadBlob(new Blob([generateHTML(reports, currency.code, volatility, numPaths)], { type: 'text/html' }), `takehomecalc-report-${timestamp}.html`);
          } else if (format === 'pdf') {
            const html = generateHTML(reports, currency.code, volatility, numPaths);
            const win = window.open('', '_blank');
            if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500); }
          }
        } catch (e) {
          console.error('Report generation failed', e);
        }
        setGenerating(false);
      }, 100);
    },
    [selectedScenarios, currency.code, volatility, numPaths],
  );

  const downloadSavedReportAs = useCallback((format: 'pdf') => {
    if (!savedDownloadTarget) return;
    if (format === 'pdf') {
      downloadDataUrl(
        savedDownloadTarget.dataUrl,
        `${savedDownloadTarget.name.replace(/\s+/g, '-').toLowerCase()}.pdf`,
      );
    }
    setShowSavedFormatPicker(false);
    setSavedDownloadTarget(null);
  }, [savedDownloadTarget]);

  // Group saved reports by category
  const thpReports = useMemo(() => savedReports.filter((r) => r.category === 'take-home-pay'), [savedReports]);
  const scReports = useMemo(() => savedReports.filter((r) => r.category === 'savings-calculator'), [savedReports]);
  const nwReports = useMemo(() => savedReports.filter((r) => r.category === 'net-worth'), [savedReports]);

  // Toggle saved report selection
  const toggleSavedSelect = useCallback((id: string) => {
    setSavedSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  // ── Render ──

  const renderSavedSection = (category: ReportCategory, reports: typeof savedReports) => {
    const meta = CATEGORY_META[category];
    const sectionSelected = reports.filter((r) => savedSelected.has(r.id));

    return (
      <div className="rp-section" key={category}>
        <div className="rp-section-header">
          <span className="rp-section-icon">{meta.icon}</span>
          <h2 className="rp-section-title">{meta.label}</h2>
          <span className="rp-section-count">{reports.length} report{reports.length !== 1 ? 's' : ''}</span>
        </div>

        {reports.length === 0 ? (
          <p className="rp-empty-text">{meta.emptyText}</p>
        ) : (
          <div className="rp-report-list">
            {reports.map((r) => (
              <div key={r.id} className={`rp-report-card${savedSelected.has(r.id) ? ' rp-report-card--selected' : ''}`}>
                <label className="rp-report-check">
                  <input type="checkbox" checked={savedSelected.has(r.id)} onChange={() => toggleSavedSelect(r.id)} />
                </label>
                <div className="rp-report-info">
                  <span className="rp-report-name">{r.name}</span>
                  <span className="rp-report-meta">
                    <span className="rp-report-date">{formatReportDate(r.createdAt)}</span>
                    {r.summary && <span className="rp-report-summary">{r.summary}</span>}
                  </span>
                </div>
                <div className="rp-report-actions">
                  <button
                    className="rp-report-dl-btn"
                    title="Download PDF"
                    onClick={() => {
                      setSavedDownloadTarget({ name: r.name, dataUrl: r.dataUrl });
                      setShowSavedFormatPicker(true);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                  <button
                    className="rp-report-del-btn"
                    title="Delete report"
                    onClick={() => removeReport(r.id)}
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {sectionSelected.length > 0 && (
          <div className="rp-section-actions">
            <span className="rp-selected-count">{sectionSelected.length} selected</span>
            <button
              className="ps-btn ps-btn--secondary rp-delete-btn"
              onClick={() => {
                setDeleteTarget({ type: 'saved', ids: new Set(sectionSelected.map((r) => r.id)) });
                setShowDeleteConfirm(true);
              }}
            >
              <TrashIcon size={14} /> Delete Selected
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="ps-page">
        <h1 className="ps-page-title">Reports</h1>
        <p className="rp-page-subtitle">All your generated reports in one place, grouped by type.</p>

        {generating && (
          <div className="report-overlay">
            <LoadingCoin text="Generating report…" />
          </div>
        )}

        {/* ═══ Take Home Pay Reports ═══ */}
        {renderSavedSection('take-home-pay', thpReports)}

        {/* ═══ Savings Calculator Reports ═══ */}
        {renderSavedSection('savings-calculator', scReports)}

        {/* ═══ Net Worth Reports ═══ */}
        {renderSavedSection('net-worth', nwReports)}

        {/* ═══ Portfolio Simulation ═══ */}
        <div className="rp-section">
          <div className="rp-section-header">
            <span className="rp-section-icon">{CATEGORY_META['portfolio-simulation'].icon}</span>
            <h2 className="rp-section-title">{CATEGORY_META['portfolio-simulation'].label}</h2>
            <span className="rp-section-count">{scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}</span>
          </div>

          {scenarios.length === 0 ? (
            <p className="rp-empty-text">{CATEGORY_META['portfolio-simulation'].emptyText}</p>
          ) : (
            <>
              <div className="rp-table-wrap">
                <table className="rp-table rp-table--portfolio">
                  <thead>
                    <tr>
                      <th className="rp-th-check">
                        <label className="rp-check-label">
                          <input type="checkbox" checked={psSelected.size === scenarios.length && scenarios.length > 0} onChange={togglePsAll} />
                        </label>
                      </th>
                      <th>Scenario</th>
                      <th>Bal</th>
                      <th>Flows</th>
                      <th>Horizons</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarios.map((s) => (
                      <tr key={s.id} className={psSelected.has(s.id) ? 'rp-row-selected' : ''}>
                        <td className="rp-td-check">
                          <label className="rp-check-label">
                            <input type="checkbox" checked={psSelected.has(s.id)} onChange={() => togglePsSelect(s.id)} />
                          </label>
                        </td>
                        <td className="rp-td-name rp-td-name--scenario">{s.name}</td>
                        <td className="rp-td-num">{formatCurrency(s.startingBalance, currency.code)}</td>
                        <td className="rp-td-num">{s.cashFlows.length}</td>
                        <td>{s.simulationEnd ? formatMonth(s.simulationEnd) : 'Auto'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rp-actions">
                <span className="rp-selected-count">{psSelected.size} selected</span>
                <div className="rp-actions-btns">
                  <button
                    className="rp-report-dl-btn rp-generate-btn"
                    disabled={psSelected.size === 0 || generating}
                    onClick={() => setShowFormatPicker(true)}
                    title="Download report"
                    aria-label="Download report"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                  <button
                    className="rp-report-del-btn"
                    disabled={psSelected.size === 0}
                    onClick={() => {
                      setDeleteTarget({ type: 'ps', ids: new Set(psSelected) });
                      setShowDeleteConfirm(true);
                    }}
                    title="Delete selected"
                    aria-label="Delete selected"
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Format picker overlay */}
        {showFormatPicker && (
          <div className="report-overlay" onClick={() => setShowFormatPicker(false)}>
            <div className="rp-format-picker" onClick={(e) => e.stopPropagation()}>
              <h3 className="rp-format-title">Choose Report Format</h3>
              <div className="rp-format-options">
                <button className="rp-format-btn" onClick={() => runReportsForSelected('html')}>
                  <span className="rp-format-icon">🌐</span>
                  <div><span className="rp-format-label">HTML</span><span className="rp-format-desc">Rich styled report, viewable in any browser</span></div>
                </button>
                <button className="rp-format-btn" onClick={() => runReportsForSelected('pdf')}>
                  <span className="rp-format-icon">📄</span>
                  <div><span className="rp-format-label">PDF</span><span className="rp-format-desc">Print-ready via browser print dialog</span></div>
                </button>
                <button className="rp-format-btn" onClick={() => runReportsForSelected('csv')}>
                  <span className="rp-format-icon">📊</span>
                  <div><span className="rp-format-label">CSV</span><span className="rp-format-desc">Opens in Excel, Google Sheets, etc.</span></div>
                </button>
              </div>
              <button className="rp-format-cancel" onClick={() => setShowFormatPicker(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Saved report format picker */}
        {showSavedFormatPicker && savedDownloadTarget && (
          <div className="report-overlay" onClick={() => { setShowSavedFormatPicker(false); setSavedDownloadTarget(null); }}>
            <div className="rp-format-picker" onClick={(e) => e.stopPropagation()}>
              <h3 className="rp-format-title">Choose Report Format</h3>
              <div className="rp-format-options">
                <button className="rp-format-btn" onClick={() => downloadSavedReportAs('pdf')}>
                  <span className="rp-format-icon">📄</span>
                  <div><span className="rp-format-label">PDF Snapshot</span><span className="rp-format-desc">Download the saved report PDF</span></div>
                </button>
              </div>
              <button className="rp-format-cancel" onClick={() => { setShowSavedFormatPicker(false); setSavedDownloadTarget(null); }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {showDeleteConfirm && deleteTarget && (
          <ConfirmDialog
            message={`Delete ${deleteTarget.ids.size} item${deleteTarget.ids.size !== 1 ? 's' : ''}? This cannot be undone.`}
            onCancel={() => { setDeleteTarget(null); setShowDeleteConfirm(false); }}
            onConfirm={deleteTarget.type === 'ps' ? handlePsDelete : handleSavedDelete}
          />
        )}
      </div>
    </div>
  );
}