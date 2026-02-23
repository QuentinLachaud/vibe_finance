import { formatCurrency } from '../../utils/currency';
import { formatMonth, type CashFlow } from '../../utils/simulationEngine';
import type { CurrencyCode } from '../../types';

interface CashFlowCardProps {
  cashFlow: CashFlow;
  currencyCode: CurrencyCode;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

const TYPE_CONFIG = {
  'one-off': {
    icon: '🎁',
    label: 'One-off Deposit',
    className: 'ps-scenario-card--inflow',
  },
  'recurring-deposit': {
    icon: '📥',
    label: 'Recurring Deposit',
    className: 'ps-scenario-card--inflow',
  },
  'recurring-withdrawal': {
    icon: '📤',
    label: 'Recurring Withdrawal',
    className: 'ps-scenario-card--outflow',
  },
} as const;

export function CashFlowCard({ cashFlow, currencyCode, onEdit, onDelete, onToggle }: CashFlowCardProps) {
  const config = TYPE_CONFIG[cashFlow.type];
  const isRecurring = cashFlow.type !== 'one-off';
  const freqLabel = cashFlow.frequency === 'annually' ? '/ year' : '/ month';
  const hasPeriodicAmount = cashFlow.amount > 0;
  const hasLump = (cashFlow.startingValue ?? 0) > 0;
  const isLumpOnly = isRecurring && !hasPeriodicAmount && hasLump;

  return (
    <div className={`ps-scenario-card ${config.className} ${!cashFlow.enabled ? 'ps-scenario-card--disabled' : ''}`}>
      <div className="ps-scenario-card-actions">
        <button
          className="ps-scenario-action-btn"
          onClick={() => onEdit(cashFlow.id)}
          aria-label="Edit cash flow"
        >
          ✏️
        </button>
        <button
          className="ps-scenario-action-btn"
          onClick={() => onDelete(cashFlow.id)}
          aria-label="Delete cash flow"
        >
          🗑️
        </button>
      </div>

      <div className="ps-scenario-card-header">
        <button
          className={`ps-scenario-toggle ${cashFlow.enabled ? 'ps-scenario-toggle--on' : ''}`}
          onClick={() => onToggle(cashFlow.id)}
          aria-label={cashFlow.enabled ? 'Disable cash flow' : 'Enable cash flow'}
        >
          <div className="ps-scenario-toggle-track" />
          <div className="ps-scenario-toggle-thumb" />
        </button>
        <span className="ps-scenario-icon">{config.icon}</span>
        <span className="ps-scenario-type">{cashFlow.label || config.label}</span>
      </div>

      {isLumpOnly ? (
        <div className="ps-scenario-amount">
          {formatCurrency(cashFlow.startingValue ?? 0, currencyCode)}
          <span className="ps-scenario-freq"> lump sum</span>
        </div>
      ) : (
        <>
          <div className="ps-scenario-amount">
            {formatCurrency(cashFlow.amount, currencyCode)}
            {isRecurring && <span className="ps-scenario-freq"> {freqLabel}</span>}
          </div>

          {isRecurring && hasLump && (
            <div className="ps-scenario-growth">
              {cashFlow.type === 'recurring-withdrawal' ? 'Lump at start:' : 'Starting value:'}{' '}
              {formatCurrency(cashFlow.startingValue ?? 0, currencyCode)}
            </div>
          )}
        </>
      )}

      <div className="ps-scenario-dates">
        {isRecurring ? (
          <>
            {formatMonth(cashFlow.startDate)} → {cashFlow.endDate ? formatMonth(cashFlow.endDate) : '∞'}
          </>
        ) : (
          formatMonth(cashFlow.startDate)
        )}
      </div>

      <div className="ps-scenario-growth">
        Growth: {cashFlow.growthRate}%
      </div>
    </div>
  );
}
