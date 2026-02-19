import { Panel, SegmentedToggle, NumberInput } from '@quentinlachaud/app-component-library';
import { useCalculator } from '../../state/CalculatorContext';
import { useCurrency } from '../../state/CurrencyContext';
import type { IncomeFrequency } from '../../types';

export function IncomeSection() {
  const { state, dispatch } = useCalculator();
  const { currency } = useCurrency();

  const frequencyOptions = [
    { value: 'monthly' as const, label: 'Monthly' },
    { value: 'annually' as const, label: 'Annually' },
  ];

  return (
    <Panel
      title="Monthly Income"
      headerActions={
        <div className="income-header-actions">
          <SegmentedToggle<IncomeFrequency>
            options={frequencyOptions}
            value={state.incomeFrequency}
            onChange={(val) =>
              dispatch({ type: 'SET_INCOME_FREQUENCY', payload: val })
            }
            size="sm"
            ariaLabel="Income frequency toggle"
          />
          <select
            className="currency-select currency-select--inline"
            value={currency.code}
            disabled
            aria-label="Currency display"
          >
            <option>{currency.label}</option>
          </select>
        </div>
      }
    >
      <div className="income-input-row">
        <span className="currency-prefix">{currency.symbol}</span>
        <NumberInput
          value={state.income}
          onChange={(val) =>
            dispatch({ type: 'SET_INCOME', payload: val ?? 0 })
          }
          min={0}
          step={100}
          fullWidth
          hideControls
        />
      </div>
    </Panel>
  );
}
