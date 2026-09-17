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

// ── Common emoji palette for quick icon editing ──
const EMOJI_PALETTE = [
  '🏠', '🛒', '🚌', '🍽️', '💡', '💊', '🎬', '👕',
  '🛡️', '📱', '🎓', '👶', '🐶', '🎁', '🧼', '🏦',
  '💳', '🚗', '✈️', '🏋️', '🎵', '📚', '🍕', '☕',
  '💻', '🏥', '🎮', '🛍️', '📋', '💰', '🔧', '🌍',
];

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

  // ── Emoji picker ──
  const [editingIconId, setEditingIconId] = useState<string | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // ── Drag and drop ──
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Focus custom input when switching to custom
  useEffect(() => {
    if (addCategory === CUSTOM_CATEGORY) customInputRef.current?.focus();
  }, [addCategory]);

  // Focus inline-edit input
  useEffect(() => {
    if (editingNameId) editNameInputRef.current?.focus();
  }, [editingNameId]);

  // Close emoji picker on click outside
  useEffect(() => {
    if (!editingIconId) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setEditingIconId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editingIconId]);

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

  const handleEmojiSelect = useCallback((expenseId: string, emoji: string) => {
    dispatch({
      type: 'UPDATE_EXPENSE',
      payload: { id: expenseId, icon: emoji },
    });
    setEditingIconId(null);
  }, [dispatch]);

  // ── Drag handlers ──
  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const items = [...state.expenses];
    const [moved] = items.splice(dragIndex, 1);
    items.splice(index, 0, moved);
    dispatch({ type: 'REORDER_EXPENSES', payload: items });
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, state.expenses, dispatch]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);


  return (
    <div className="expenses-section">
      <h3 className="expenses-title">Monthly Expenses</h3>

      <div className="expenses-list">
        {state.expenses.map((expense, index) => (
          <div
            key={expense.id}
            className={`expense-row${dragIndex === index ? ' expense-row--dragging' : ''}${dragOverIndex === index ? ' expense-row--drag-over' : ''}`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
            onDragEnd={handleDragEnd}
          >
            {/* Drag handle */}
            <span className="expense-drag-handle" title="Drag to reorder">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="5" r="2" /><circle cx="15" cy="5" r="2" />
                <circle cx="9" cy="12" r="2" /><circle cx="15" cy="12" r="2" />
                <circle cx="9" cy="19" r="2" /><circle cx="15" cy="19" r="2" />
              </svg>
            </span>

            {/* Tappable emoji icon */}
            <span className="expense-icon-wrapper">
              <button
                className="expense-icon-btn"
                onClick={() => setEditingIconId(editingIconId === expense.id ? null : expense.id)}
                aria-label="Change icon"
                title="Tap to change icon"
              >
                {expense.icon ?? '📋'}
              </button>
              {editingIconId === expense.id && (
                <div ref={emojiPickerRef} className="expense-emoji-picker">
                  {EMOJI_PALETTE.map((emoji) => (
                    <button
                      key={emoji}
                      className={`expense-emoji-option${emoji === expense.icon ? ' expense-emoji-option--active' : ''}`}
                      onClick={() => handleEmojiSelect(expense.id, emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </span>

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

          <div className="expense-add-row expense-add-amount-row">
            <span className="expense-add-currency">{currency.symbol}</span>
            <input
              className="expense-add-amount-input"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={addAmount || ''}
              onChange={(e) => {
                const v = Number(e.target.value.replace(/,/g, ''));
                if (!isNaN(v)) setAddAmount(v);
              }}
              onFocus={(e) => e.target.select()}
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
