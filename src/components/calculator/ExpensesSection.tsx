import { useState } from 'react';
import { Button, NumberInput, TextInput } from '@quentinlachaud/app-component-library';
import { useCalculator } from '../../state/CalculatorContext';
import { useCurrency } from '../../state/CurrencyContext';

const CATEGORY_ICONS: Record<string, string> = {
  Housing: '🏠',
  Groceries: '🛒',
  Transportation: '🚌',
  'Dining Out': '🍴',
};

function getCategoryIcon(name: string): string {
  return CATEGORY_ICONS[name] ?? '📋';
}

export function ExpensesSection() {
  const { state, dispatch } = useCalculator();
  const { currency } = useCurrency();
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState<number>(0);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (isAdding) {
      if (newName.trim() && newAmount > 0) {
        dispatch({
          type: 'ADD_EXPENSE',
          payload: { name: newName.trim(), amount: newAmount },
        });
        setNewName('');
        setNewAmount(0);
        setIsAdding(false);
      }
    } else {
      setIsAdding(true);
    }
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewName('');
    setNewAmount(0);
  };

  return (
    <div className="expenses-section">
      <h3 className="expenses-title">Monthly Income</h3>
      <div className="expenses-list">
        {state.expenses.map((expense) => (
          <div key={expense.id} className="expense-row">
            <span className="expense-icon">{getCategoryIcon(expense.name)}</span>
            <span className="expense-name">{expense.name}</span>
            <div className="expense-amount-group">
              <span className="currency-prefix-sm">{currency.symbol}</span>
              <NumberInput
                value={expense.amount}
                onChange={(val) =>
                  dispatch({
                    type: 'UPDATE_EXPENSE',
                    payload: { id: expense.id, amount: val ?? 0 },
                  })
                }
                min={0}
                step={10}
                hideControls
                size="sm"
              />
            </div>
            <button
              className="expense-remove"
              onClick={() =>
                dispatch({ type: 'REMOVE_EXPENSE', payload: expense.id })
              }
              aria-label={`Remove ${expense.name}`}
            >
              ▾
            </button>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="expense-add-form">
          <TextInput
            placeholder="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            size="sm"
            fullWidth
          />
          <div className="expense-amount-group">
            <span className="currency-prefix-sm">{currency.symbol}</span>
            <NumberInput
              value={newAmount}
              onChange={(val) => setNewAmount(val ?? 0)}
              min={0}
              step={10}
              hideControls
              size="sm"
            />
          </div>
          <button className="expense-cancel-btn" onClick={handleCancelAdd}>
            ✕
          </button>
        </div>
      )}

      <Button variant="primary" fullWidth onClick={handleAdd}>
        + Add Expense
      </Button>
    </div>
  );
}
