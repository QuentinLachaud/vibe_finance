import { NumberInput } from '@quentinlachaud/app-component-library';
import { useCalculator } from '../../state/CalculatorContext';
import { useCurrency } from '../../state/CurrencyContext';
import type { IncomeFrequency } from '../../types';

export function IncomeSection() {
  const { state, dispatch } = useCalculator();
  const { currency } = useCurrency();

  const isMonthly = state.incomeFrequency === 'monthly';
  const setFreq = (f: IncomeFrequency) =>
    dispatch({ type: 'SET_INCOME_FREQUENCY', payload: f });

  return (
    <div className="sc-income">
      <div className="sc-income-top">
        <span className="sc-income-label">
          {isMonthly ? 'Monthly Net Income' : 'Annual Net Income'}
        </span>
        <div className="sc-freq-toggle">
          <button
            className={`sc-freq-btn${isMonthly ? ' sc-freq-btn--active' : ''}`}
            onClick={() => setFreq('monthly')}
          >
            Monthly
          </button>
          <button
            className={`sc-freq-btn${!isMonthly ? ' sc-freq-btn--active' : ''}`}
            onClick={() => setFreq('annually')}
          >
            Annually
          </button>
        </div>
      </div>
      <div className="sc-income-field">
        <span className="sc-income-symbol">{currency.symbol}</span>
        <NumberInput
          value={state.income}
          onChange={(val) => dispatch({ type: 'SET_INCOME', payload: val ?? 0 })}
          min={0}
          step={100}
          fullWidth
          hideControls
        />
      </div>
    </div>
  );
}

