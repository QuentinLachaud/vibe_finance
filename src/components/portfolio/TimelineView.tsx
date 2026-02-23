import { useState } from 'react';
import { formatCurrency } from '../../utils/currency';
import { currentMonth, formatMonth, type CashFlow } from '../../utils/simulationEngine';
import type { CurrencyCode } from '../../types';

interface TimelineViewProps {
  cashFlows: CashFlow[];
  simulationEnd: string;
  currencyCode: CurrencyCode;
  onEdit?: (id: string) => void;
}

/** Convert "YYYY-MM" to a decimal year (e.g. "2026-06" → 2026.42) */
function toYearDecimal(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return y + (m - 1) / 12;
}

/** Generate evenly-spaced year labels for the axis. */
function getAxisYears(startYear: number, endYear: number): number[] {
  const range = endYear - startYear;
  let step = 1;
  if (range > 25) step = 5;
  else if (range > 12) step = 3;
  else if (range > 6) step = 2;

  const labels: number[] = [];
  const first = Math.ceil(startYear / step) * step;
  for (let y = first; y <= endYear; y += step) {
    labels.push(y);
  }
  return labels;
}

const TYPE_INFO = {
  'one-off': { sign: '+', colorClass: 'ps-tl-bar--inflow' },
  'recurring-deposit': { sign: '+', colorClass: 'ps-tl-bar--inflow' },
  'recurring-withdrawal': { sign: '−', colorClass: 'ps-tl-bar--outflow' },
} as const;

/** Build a compact amount string like "+£1,666/mo" */
function amountStr(s: CashFlow, currencyCode: CurrencyCode): string {
  const info = TYPE_INFO[s.type];
  const isRecurring = s.type !== 'one-off';
  const hasPeriodicAmount = s.amount > 0;
  const hasLump = (s.startingValue ?? 0) > 0;
  // If periodic is £0 but there's a lump, show the lump instead
  if (isRecurring && !hasPeriodicAmount && hasLump) {
    return `${info.sign}${formatCurrency(s.startingValue!, currencyCode)} lump`;
  }
  const freqLabel = s.type === 'one-off' ? '' : s.frequency === 'annually' ? '/yr' : '/mo';
  return `${info.sign}${formatCurrency(s.amount, currencyCode)}${freqLabel}`;
}

/** Build full tooltip text */
function tooltipText(s: CashFlow, currencyCode: CurrencyCode): string {
  const parts = [s.label];
  parts.push(amountStr(s, currencyCode));
  if (s.type !== 'one-off' && (s.startingValue ?? 0) > 0) {
    const sv = formatCurrency(s.startingValue!, currencyCode);
    parts.push(s.type === 'recurring-withdrawal' ? `Lump: ${sv}` : `Starting: ${sv}`);
  }
  if (s.type === 'one-off') {
    parts.push(formatMonth(s.startDate));
  } else {
    parts.push(`${formatMonth(s.startDate)} → ${s.endDate ? formatMonth(s.endDate) : '∞'}`);
  }
  parts.push(`Growth: ${s.growthRate}%`);
  return parts.join('\n');
}

export function TimelineView({ cashFlows, simulationEnd, currencyCode, onEdit }: TimelineViewProps) {
  const [open, setOpen] = useState(false);

  if (cashFlows.length === 0) return null;

  const now = currentMonth();
  const rangeStart = toYearDecimal(now);
  const rangeEnd = toYearDecimal(simulationEnd);
  const rangeDuration = Math.max(1, rangeEnd - rangeStart);

  const axisYears = getAxisYears(Math.floor(rangeStart), Math.ceil(rangeEnd));

  // Sort: inflows first (one-off, deposits), then outflows
  const sorted = [...cashFlows].sort((a, b) => {
    const order = { 'one-off': 0, 'recurring-deposit': 1, 'recurring-withdrawal': 2 };
    return order[a.type] - order[b.type];
  });

  return (
    <div className="ps-card ps-tl-card">
      <div className="ps-tl-header">
        <button
          className="ps-table-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span>Timeline</span>
          <span className={`ps-table-arrow ${open ? 'ps-table-arrow--open' : ''}`}>▼</span>
        </button>
      </div>

      <div className={`ps-tl-body ${open ? 'ps-tl-body--open' : ''}`}>
        <div className="ps-tl-content">
          {/* Cash flow bars */}
          <div className="ps-tl-rows">
            {sorted.map((s) => {
              const info = TYPE_INFO[s.type];
              const startDec = toYearDecimal(s.startDate);
              const endDec = s.endDate ? toYearDecimal(s.endDate) : startDec;

              const leftPct = Math.max(0, ((startDec - rangeStart) / rangeDuration) * 100);
              const rawWidth = ((endDec - startDec) / rangeDuration) * 100;
              const widthPct = Math.max(5, rawWidth); // min 5% for visibility
              const clampedWidth = Math.min(widthPct, 100 - leftPct);
              const isNarrow = clampedWidth < 18;

              const amt = amountStr(s, currencyCode);

              return (
                <div key={s.id} className="ps-tl-row" title={tooltipText(s, currencyCode)}>
                  <div
                    className={`ps-tl-bar ${info.colorClass} ${!s.enabled ? 'ps-tl-bar--disabled' : ''} ${onEdit ? 'ps-tl-bar--clickable' : ''}`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${clampedWidth}%`,
                    }}
                    onClick={onEdit ? () => onEdit(s.id) : undefined}
                    role={onEdit ? 'button' : undefined}
                    tabIndex={onEdit ? 0 : undefined}
                    onKeyDown={onEdit ? (e) => { if (e.key === 'Enter' || e.key === ' ') onEdit(s.id); } : undefined}
                  >
                    {isNarrow ? (
                      <span className="ps-tl-bar-amount">{amt}</span>
                    ) : (
                      <>
                        <span className="ps-tl-bar-label">{s.label}</span>
                        <span className="ps-tl-bar-amount">{amt}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Year axis */}
          <div className="ps-tl-axis">
            {axisYears.map((y) => {
              const leftPct = ((y - rangeStart) / rangeDuration) * 100;
              return (
                <span key={y} className="ps-tl-axis-label" style={{ left: `${leftPct}%` }}>
                  {y}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
