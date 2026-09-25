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

function toYearDecimal(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return y + (m - 1) / 12;
}

function getAxisYears(startYear: number, endYear: number): number[] {
  const start = Math.ceil(startYear);
  const end = Math.floor(endYear);
  if (end <= start) return [start];

  const range = end - start;
  const targetLabels = Math.min(5, range + 1);
  if (targetLabels <= 2) return [start, end];

  const step = Math.max(1, Math.ceil(range / (targetLabels - 1)));
  const labels = [start];
  for (let year = start + step; year < end; year += step) {
    labels.push(year);
  }
  if (labels[labels.length - 1] !== end) labels.push(end);
  return labels.slice(0, 5);
}

const TYPE_INFO = {
  'one-off': { sign: '+', colorClass: 'ps-tl-mark--inflow', kind: 'One-off' },
  'recurring-deposit': { sign: '+', colorClass: 'ps-tl-mark--inflow', kind: 'Deposit' },
  'recurring-withdrawal': { sign: '−', colorClass: 'ps-tl-mark--outflow', kind: 'Withdrawal' },
} as const;

function amountStr(s: CashFlow, currencyCode: CurrencyCode): string {
  const info = TYPE_INFO[s.type];
  const isRecurring = s.type !== 'one-off';
  const hasPeriodicAmount = s.amount > 0;
  const hasLump = (s.startingValue ?? 0) > 0;
  if (isRecurring && !hasPeriodicAmount && hasLump) {
    return `${info.sign}${formatCurrency(s.startingValue!, currencyCode)} lump`;
  }
  const freqLabel = s.type === 'one-off' ? '' : s.frequency === 'annually' ? '/yr' : '/mo';
  return `${info.sign}${formatCurrency(s.amount, currencyCode)}${freqLabel}`;
}

function dateStr(s: CashFlow): string {
  if (s.type === 'one-off') return formatMonth(s.startDate);
  return `${formatMonth(s.startDate)} – ${s.endDate ? formatMonth(s.endDate) : 'Ongoing'}`;
}

function tooltipText(s: CashFlow, currencyCode: CurrencyCode): string {
  const parts = [s.label, amountStr(s, currencyCode), dateStr(s)];
  if (s.type !== 'one-off' && (s.startingValue ?? 0) > 0) {
    const sv = formatCurrency(s.startingValue!, currencyCode);
    parts.push(s.type === 'recurring-withdrawal' ? `Lump: ${sv}` : `Starting: ${sv}`);
  }
  parts.push(`Growth: ${s.growthRate}%`);
  return parts.join('\n');
}

export function TimelineView({ cashFlows, simulationEnd, currencyCode, onEdit }: TimelineViewProps) {
  const [open, setOpen] = useState(false);

  if (cashFlows.length === 0) return null;

  const now = currentMonth();
  const rangeStart = toYearDecimal(now);
  const rangeEnd = Math.max(rangeStart + 1 / 12, toYearDecimal(simulationEnd));
  const rangeDuration = rangeEnd - rangeStart;
  const axisYears = getAxisYears(Math.floor(rangeStart), Math.ceil(rangeEnd));

  const sorted = [...cashFlows].sort((a, b) => {
    const order = { 'one-off': 0, 'recurring-deposit': 1, 'recurring-withdrawal': 2 };
    return order[a.type] - order[b.type];
  });

  return (
    <div className="ps-card ps-tl-card">
      <div className="ps-tl-header">
        <button
          className="ps-table-toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <span>Timeline</span>
          <span className={`ps-table-arrow ${open ? 'ps-table-arrow--open' : ''}`} aria-hidden="true">
            ›
          </span>
        </button>
      </div>

      <div className={`ps-tl-body ${open ? 'ps-tl-body--open' : ''}`}>
        <div className="ps-tl-content">
          <div className="ps-tl-rows">
            {sorted.map((s) => {
              const info = TYPE_INFO[s.type];
              const startDec = Math.min(rangeEnd, Math.max(rangeStart, toYearDecimal(s.startDate)));
              const rawEnd = s.type === 'one-off'
                ? startDec
                : Math.min(rangeEnd, Math.max(startDec, toYearDecimal(s.endDate ?? simulationEnd)));
              const leftPct = ((startDec - rangeStart) / rangeDuration) * 100;
              const rightPct = ((rawEnd - rangeStart) / rangeDuration) * 100;
              const widthPct = Math.max(0, rightPct - leftPct);
              const editable = Boolean(onEdit);

              const handleActivate = () => {
                if (onEdit) onEdit(s.id);
              };

              return (
                <div
                  key={s.id}
                  className={`ps-tl-row ${!s.enabled ? 'ps-tl-row--disabled' : ''} ${editable ? 'ps-tl-row--clickable' : ''}`}
                  title={tooltipText(s, currencyCode)}
                  onClick={editable ? handleActivate : undefined}
                  role={editable ? 'button' : undefined}
                  tabIndex={editable ? 0 : undefined}
                  onKeyDown={editable ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleActivate();
                    }
                  } : undefined}
                >
                  <div className="ps-tl-meta">
                    <div className="ps-tl-meta-copy">
                      <span className="ps-tl-label">{s.label}</span>
                      <span className="ps-tl-dates">{info.kind} · {dateStr(s)}</span>
                    </div>
                    <span className={`ps-tl-amount ${info.colorClass}`}>
                      {amountStr(s, currencyCode)}
                    </span>
                  </div>

                  <div className="ps-tl-track" aria-hidden="true">
                    {s.type === 'one-off' ? (
                      <span
                        className={`ps-tl-marker ${info.colorClass}`}
                        style={{ left: `${leftPct}%` }}
                      />
                    ) : (
                      <span
                        className={`ps-tl-range ${info.colorClass}`}
                        style={{
                          left: `${leftPct}%`,
                          width: `${Math.max(widthPct, 0.8)}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="ps-tl-axis" aria-hidden="true">
            {axisYears.map((year, index) => {
              const leftPct = Math.min(100, Math.max(0, ((year - rangeStart) / rangeDuration) * 100));
              const edgeClass = index === 0
                ? 'ps-tl-axis-label--start'
                : index === axisYears.length - 1
                  ? 'ps-tl-axis-label--end'
                  : '';
              return (
                <span
                  key={year}
                  className={`ps-tl-axis-label ${edgeClass}`}
                  style={{ left: `${leftPct}%` }}
                >
                  {year}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
