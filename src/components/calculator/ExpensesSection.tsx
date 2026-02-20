import { useEffect, useState } from 'react';
import { Button, NumberInput, TextInput } from '@quentinlachaud/app-component-library';
import { useCalculator } from '../../state/CalculatorContext';
import { useCurrency } from '../../state/CurrencyContext';
import { ConfirmDialog, useConfirmDialog } from './ConfirmDialog';

const CATEGORY_ICONS: Record<string, string> = {
  Housing: '🏠',
  Groceries: '🛒',
  Transportation: '🚌',
  'Dining Out': '🍴',
};

const EXPENSE_EMOJIS = [
  '🏠', '🏢', '🧾', '🛒', '🍽️', '☕', '🍔', '🚗', '🚌', '🚕',
  '⛽', '✈️', '🚆', '🚲', '🧥', '👕', '👟', '💊', '🩺', '🏥',
  '🎓', '📚', '🎬', '🎮', '🎵', '🏋️', '🏖️', '🐶', '👶', '🎁',
  '💡', '📱', '💻', '🔧', '🧼', '🧺', '📦', '💼', '🏦', '📋',
];

function getCategoryIcon(name: string): string {
  return CATEGORY_ICONS[name] ?? '📋';
}

export function ExpensesSection() {
  const { state, dispatch } = useCalculator();
  const { currency } = useCurrency();
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newIcon, setNewIcon] = useState('📋');
  const [isAdding, setIsAdding] = useState(false);
  const [activePickerId, setActivePickerId] = useState<string | null>(null);
  const [newPickerOpen, setNewPickerOpen] = useState(false);
  const { pendingId, requestConfirm, cancel, confirm } = useConfirmDialog();

  const pendingExpense = pendingId
    ? state.expenses.find((e) => e.id === pendingId)
    : null;

  const handleStartAdd = () => {
    setIsAdding(true);
    setActivePickerId(null);
  };

  useEffect(() => {
    if (!isAdding) return;
    if (!newName.trim() || newAmount <= 0) return;

    const timer = setTimeout(() => {
      dispatch({
        type: 'ADD_EXPENSE',
        payload: { name: newName.trim(), amount: newAmount, icon: newIcon },
      });
      setNewName('');
      setNewAmount(0);
      setNewIcon('📋');
      setNewPickerOpen(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [isAdding, newName, newAmount, dispatch]);

  return (
    <div className="expenses-section">
      <h3 className="expenses-title">Monthly Expenses</h3>
      <div className="expenses-list">
        {state.expenses.map((expense) => (
          <div key={expense.id} className="expense-row">
            <div className="expense-icon-picker">
              <button
                className="expense-icon-btn"
                onClick={() =>
                  setActivePickerId((curr) =>
                    curr === expense.id ? null : expense.id,
                  )
                }
                aria-label={`Change icon for ${expense.name}`}
              >
                {expense.icon ?? getCategoryIcon(expense.name)}
              </button>
              {activePickerId === expense.id && (
                <div className="emoji-picker" role="dialog" aria-label="Choose expense icon">
                  {EXPENSE_EMOJIS.map((emoji) => (
                    <button
                      key={`${expense.id}-${emoji}`}
                      className="emoji-option"
                      onClick={() => {
                        dispatch({
                          type: 'UPDATE_EXPENSE',
                          payload: { id: expense.id, icon: emoji },
                        });
                        setActivePickerId(null);
                      }}
                      aria-label={`Set icon ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
              className="expense-delete-btn"
              onClick={() => requestConfirm(expense.id)}
              aria-label={`Remove ${expense.name}`}
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="expense-add-form">
          <div className="expense-icon-picker">
            <button
              className="expense-icon-btn"
              onClick={() => setNewPickerOpen((v) => !v)}
              aria-label="Choose icon for new expense"
            >
              {newIcon}
            </button>
            {newPickerOpen && (
              <div className="emoji-picker" role="dialog" aria-label="Choose new expense icon">
                {EXPENSE_EMOJIS.map((emoji) => (
                  <button
                    key={`new-${emoji}`}
                    className="emoji-option"
                    onClick={() => {
                      setNewIcon(emoji);
                      setNewPickerOpen(false);
                    }}
                    aria-label={`Set new icon ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <TextInput
            placeholder="Category"
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
        </div>
      )}

      <Button variant="primary" fullWidth onClick={handleStartAdd} disabled={isAdding}>
        + Add Expense
      </Button>

      {pendingId && pendingExpense && (
        <ConfirmDialog
          message={`Remove "${pendingExpense.name}" expense?`}
          onCancel={cancel}
          onConfirm={() =>
            confirm((id) =>
              dispatch({ type: 'REMOVE_EXPENSE', payload: id }),
            )
          }
        />
      )}
    </div>
  );
}
