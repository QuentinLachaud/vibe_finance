import { useState, useCallback, useRef, useEffect } from 'react';
import { NumberInput } from '@quentinlachaud/app-component-library';
import { useCalculator } from '../../state/CalculatorContext';
import { useCurrency } from '../../state/CurrencyContext';
import { ConfirmDialog, useConfirmDialog } from './ConfirmDialog';
import { TrashIcon } from '../Icons';

// ── Preset categories ──
const PRESET_CATEGORIES: { name: string; icon: string }[] = [
  { name: 'Housing', icon: '🏠' },
  { name: 'Groceries', icon: '🛒' },
  { name: 'Transportation', icon: '🚌' },
  { name: 'Dining Out', icon: '🍽️' },
  { name: 'Utilities', icon: '💡' },
  { name: 'Healthcare', icon: '💊' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Clothing', icon: '👕' },
  { name: 'Insurance', icon: '🛡️' },
  { name: 'Subscriptions', icon: '📱' },
  { name: 'Education', icon: '🎓' },
  { name: 'Childcare', icon: '👶' },
  { name: 'Pets', icon: '🐶' },
  { name: 'Gifts', icon: '🎁' },
  { name: 'Personal Care', icon: '🧼' },
  { name: 'Savings', icon: '🏦' },
];

const CUSTOM_CATEGORY = '__custom__';

export function ExpensesSection() {
  const { state, dispatch } = useCalculator();
  const { currency } = useCurrency();
  const { pendingId, requestConfirm, cancel, confirm } = useConfirmDialog();
  const pendingExpense = pendingId ? state.expenses.find((e) => e.id === pendingId) : null;

  // ── Add-expense flow ──
  const [showAdd, setShowAdd] = useState(false);
  const [addCategory, setAddCategory] = useState('');
  const [addCustomName, setAddCustomName] = useState('');
  const [addAmount, setAddAmount] = useState<number>(0);
  const customInputRef = useRef<HTMLInputElement>(null);

  // ── Inline name editing ──
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const editNameInputRef = useRef<HTMLInputElement>(null);

  // Focus custom input when switching to custom
  useEffect(() => {
    if (addCategory === CUSTOM_CATEGORY) customInputRef.current?.focus();
  }, [addCategory]);

  // Focus inline-edit input
  useEffect(() => {
    if (editingNameId) editNameInputRef.current?.focus();
  }, [editingNameId]);

  // Already-used category names (to filter dropdown)
  const usedNames = new Set(state.expenses.map((e) => e.name));

  // Available presets not already in use
  const availablePresets = PRESET_CATEGORIES.filter((c) => !usedNames.has(c.name));

  const handleAddSubmit = useCallback(() => {
    const isCustom = addCategory === CUSTOM_CATEGORY;
    const name = isCustom ? addCustomName.trim() : addCategory;
    if (!name || addAmount <= 0) return;
    const preset = PRESET_CATEGORIES.find((c) => c.name === name);
    dispatch({
      type: 'ADD_EXPENSE',
      payload: { name, amount: addAmount, icon: preset?.icon ?? '📋' },
    });
    // Reset form
    setAddCategory('');
    setAddCustomName('');
    setAddAmount(0);
    setShowAdd(false);
  }, [addCategory, addCustomName, addAmount, dispatch]);

  const handleCancelAdd = useCallback(() => {
    setShowAdd(false);
    setAddCategory('');
    setAddCustomName('');
    setAddAmount(0);
  }, []);

  const startEditName = useCallback((id: string, currentName: string) => {
    setEditingNameId(id);
    setEditNameValue(currentName);
  }, []);

  const commitEditName = useCallback(() => {
    if (editingNameId && editNameValue.trim()) {
      dispatch({
        type: 'UPDATE_EXPENSE',
        payload: { id: editingNameId, name: editNameValue.trim() },
      });
    }
    setEditingNameId(null);
    setEditNameValue('');
  }, [editingNameId, editNameValue, dispatch]);

  // Determine if an expense was user-added (custom)
  const isCustomExpense = useCallback((name: string) => {
    return !PRESET_CATEGORIES.some((c) => c.name === name);
  }, []);

  return (
    <div className="expenses-section">
      <h3 className="expenses-title">Monthly Expenses</h3>

      <div className="expenses-list">
        {state.expenses.map((expense) => (
          <div key={expense.id} className="expense-row">
            <span className="expense-icon">{expense.icon ?? '📋'}</span>

            {/* Editable name */}
            {editingNameId === expense.id ? (
              <input
                ref={editNameInputRef}
                className="expense-name-edit"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                onBlur={commitEditName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEditName();
                  if (e.key === 'Escape') { setEditingNameId(null); setEditNameValue(''); }
                }}
              />
            ) : (
              <span
                className="expense-name"
                onClick={() => startEditName(expense.id, expense.name)}
                title="Click to rename"
              >
                {expense.name}
                {isCustomExpense(expense.name) && (
                  <span className="expense-custom-badge">custom</span>
                )}
              </span>
            )}

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
              <TrashIcon size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Add expense form */}
      {showAdd && (
        <div className="expense-add-card">
          <div className="expense-add-row">
            <select
              className="expense-cat-select"
              value={addCategory}
              onChange={(e) => {
                setAddCategory(e.target.value);
                setAddCustomName('');
              }}
            >
              <option value="" disabled>Choose category…</option>
              {availablePresets.map((c) => (
                <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
              ))}
              <option value={CUSTOM_CATEGORY}>✏️ Custom…</option>
            </select>
          </div>

          {addCategory === CUSTOM_CATEGORY && (
            <div className="expense-add-row">
              <input
                ref={customInputRef}
                className="expense-custom-input"
                placeholder="Category name"
                value={addCustomName}
                onChange={(e) => setAddCustomName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubmit(); }}
              />
            </div>
          )}

          <div className="expense-add-row">
            <span className="currency-prefix-sm">{currency.symbol}</span>
            <NumberInput
              value={addAmount}
              onChange={(val) => setAddAmount(val ?? 0)}
              min={0}
              step={10}
              hideControls
              size="sm"
            />
          </div>

          <div className="expense-add-actions">
            <button className="expense-add-cancel" onClick={handleCancelAdd}>Cancel</button>
            <button
              className="expense-add-confirm"
              onClick={handleAddSubmit}
              disabled={
                (!addCategory || (addCategory === CUSTOM_CATEGORY && !addCustomName.trim())) ||
                addAmount <= 0
              }
            >
              Add
            </button>
          </div>
        </div>
      )}

      {!showAdd && (
        <button className="expense-add-btn" onClick={() => setShowAdd(true)}>
          + Add Expense
        </button>
      )}

      {pendingId && pendingExpense && (
        <ConfirmDialog
          message={`Remove "${pendingExpense.name}" expense?`}
          onCancel={cancel}
          onConfirm={() =>
            confirm((id) => dispatch({ type: 'REMOVE_EXPENSE', payload: id }))
          }
        />
      )}
    </div>
  );
}
