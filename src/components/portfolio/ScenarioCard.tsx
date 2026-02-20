import { formatCurrency } from '../../utils/currency';
import { formatMonth, type Scenario } from '../../utils/simulationEngine';
import type { CurrencyCode } from '../../types';

interface ScenarioCardProps {
  scenario: Scenario;
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

export function ScenarioCard({ scenario, currencyCode, onEdit, onDelete, onToggle }: ScenarioCardProps) {
  const config = TYPE_CONFIG[scenario.type];
  const isRecurring = scenario.type !== 'one-off';
  const freqLabel = scenario.frequency === 'annually' ? '/ year' : '/ month';

  return (
    <div className={`ps-scenario-card ${config.className} ${!scenario.enabled ? 'ps-scenario-card--disabled' : ''}`}>
      <div className="ps-scenario-card-actions">
        <button
          className="ps-scenario-action-btn"
          onClick={() => onEdit(scenario.id)}
          aria-label="Edit scenario"
        >
          ✏️
        </button>
        <button
          className="ps-scenario-action-btn"
          onClick={() => onDelete(scenario.id)}
          aria-label="Delete scenario"
        >
          🗑️
        </button>
      </div>

      <div className="ps-scenario-card-header">
        <button
          className={`ps-scenario-toggle ${scenario.enabled ? 'ps-scenario-toggle--on' : ''}`}
          onClick={() => onToggle(scenario.id)}
          aria-label={scenario.enabled ? 'Disable scenario' : 'Enable scenario'}
        >
          <div className="ps-scenario-toggle-track" />
          <div className="ps-scenario-toggle-thumb" />
        </button>
        <span className="ps-scenario-icon">{config.icon}</span>
        <span className="ps-scenario-type">{scenario.label || config.label}</span>
      </div>

      <div className="ps-scenario-amount">
        {formatCurrency(scenario.amount, currencyCode)}
        {isRecurring && <span className="ps-scenario-freq"> {freqLabel}</span>}
      </div>

      <div className="ps-scenario-dates">
        {isRecurring ? (
          <>
            {formatMonth(scenario.startDate)} → {scenario.endDate ? formatMonth(scenario.endDate) : '∞'}
          </>
        ) : (
          formatMonth(scenario.startDate)
        )}
      </div>

      <div className="ps-scenario-growth">
        Growth: {scenario.growthRate}%
      </div>
    </div>
  );
}
