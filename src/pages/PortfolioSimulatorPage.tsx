import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useCurrency } from '../state/CurrencyContext';
import { useAuth } from '../state/AuthContext';
import { formatCurrency } from '../utils/currency';
import {
  runSimulation,
  generateId,
  currentMonth,
  type CashFlow,
  type CashFlowType,
  type SimulationResult,
} from '../utils/simulationEngine';
import { CashFlowCard } from '../components/portfolio/CashFlowCard';
import { MonteCarloChart } from '../components/portfolio/MonteCarloChart';
import { TimelineView } from '../components/portfolio/TimelineView';
import { LoginModal } from '../components/LoginModal';
import { usePersistedState } from '../hooks/usePersistedState';
import { loadScenarios, saveScenario, removeScenario } from '../services/scenarioService';
import type { SavedScenario } from '../types';

// ── Helpers ──

function addMonths(ym: string, months: number): string {
  const [y, m] = ym.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

function getDefaultSimulationYears(): number {
  try {
    const raw = localStorage.getItem('vibe-finance-sim-default-years');
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) {
      return Math.min(60, Math.max(5, Math.round(parsed)));
    }
  } catch {
    // ignore storage errors
  }
  return 30;
}

// SavedScenario is imported from ../types

// ── Sub-components ──

function CurrencyInput({
  value,
  onChange,
  symbol,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  symbol: string;
  ariaLabel: string;
}) {
  const [raw, setRaw] = useState(value.toLocaleString('en-GB'));

  useEffect(() => {
    setRaw(value.toLocaleString('en-GB'));
  }, [value]);

  const handleBlur = () => {
    const parsed = Number(raw.replace(/,/g, ''));
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    } else {
      setRaw(value.toLocaleString('en-GB'));
    }
  };

  return (
    <div className="ps-currency-input">
      <span className="ps-currency-prefix">{symbol}</span>
      <input
        type="text"
        inputMode="numeric"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={handleBlur}
        aria-label={ariaLabel}
      />
    </div>
  );
}

function NumericInput({
  value,
  onChange,
  suffix,
  ariaLabel,
  min = 0,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  ariaLabel: string;
  min?: number;
  max?: number;
}) {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  const handleBlur = () => {
    let parsed = Number(raw);
    if (isNaN(parsed)) {
      setRaw(String(value));
      return;
    }
    if (min !== undefined) parsed = Math.max(min, parsed);
    if (max !== undefined) parsed = Math.min(max, parsed);
    onChange(parsed);
  };

  return (
    <div className="ps-numeric-input">
      <input
        type="text"
        inputMode="decimal"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={handleBlur}
        aria-label={ariaLabel}
      />
      {suffix && <span className="ps-numeric-suffix">{suffix}</span>}
    </div>
  );
}

function MonthInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <input
      type="month"
      className="ps-month-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
    />
  );
}

// ── Cash Flow Form ──

interface CashFlowFormProps {
  initial?: CashFlow;
  currencySymbol: string;
  onSave: (cashFlow: CashFlow) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterSubmit?: (submitFn: (() => void) | null) => void;
}

function CashFlowForm({ initial, currencySymbol, onSave, onCancel, onDirtyChange, onRegisterSubmit }: CashFlowFormProps) {
  const isEditing = !!initial;
  const [type, setType] = useState<CashFlowType>(initial?.type ?? 'one-off');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [startingValue, setStartingValue] = useState(initial?.startingValue ?? 0);
  const [growthRate, setGrowthRate] = useState(initial?.growthRate ?? 5);
  const [startDate, setStartDate] = useState(initial?.startDate ?? currentMonth());
  const [endDate, setEndDate] = useState(initial?.endDate ?? addMonths(currentMonth(), 180));
  const [frequency, setFrequency] = useState<'monthly' | 'annually'>(initial?.frequency ?? 'monthly');

  // When type changes and we're not editing, reset to blank
  useEffect(() => {
    if (!isEditing) {
      setLabel('');
      setAmount(0);
      setStartingValue(0);
      setGrowthRate(5);
      setStartDate(currentMonth());
      setEndDate(addMonths(currentMonth(), 180));
      setFrequency('monthly');
    }
  }, [type, isEditing]);

  const isRecurring = type !== 'one-off';

  const baseline = useMemo(() => {
    if (initial) {
      return {
        type: initial.type,
        label: initial.label ?? '',
        amount: initial.amount,
        startingValue: initial.startingValue ?? 0,
        growthRate: initial.growthRate,
        startDate: initial.startDate,
        endDate: initial.endDate ?? addMonths(currentMonth(), 180),
        frequency: initial.frequency ?? 'monthly',
      };
    }

    return {
      type,
      label: '',
      amount: 0,
      startingValue: 0,
      growthRate: 5,
      startDate: currentMonth(),
      endDate: addMonths(currentMonth(), 180),
      frequency: 'monthly' as const,
    };
  }, [initial, type]);

  const isFormDirty = useMemo(() => {
    const commonChanged =
      type !== baseline.type ||
      label !== baseline.label ||
      amount !== baseline.amount ||
      growthRate !== baseline.growthRate ||
      startDate !== baseline.startDate;

    if (!isRecurring) {
      return commonChanged;
    }

    return (
      commonChanged ||
      startingValue !== baseline.startingValue ||
      endDate !== baseline.endDate ||
      frequency !== baseline.frequency
    );
  }, [
    type,
    label,
    amount,
    growthRate,
    startDate,
    isRecurring,
    startingValue,
    endDate,
    frequency,
    baseline,
  ]);

  useEffect(() => {
    onDirtyChange?.(isFormDirty);
  }, [isFormDirty, onDirtyChange]);

  useEffect(() => () => {
    onDirtyChange?.(false);
  }, [onDirtyChange]);

  const handleSubmit = () => {
    onSave({
      id: initial?.id ?? generateId(),
      type,
      label: label || (type === 'one-off' ? 'One-off' : type === 'recurring-deposit' ? 'Deposit' : 'Withdrawal'),
      amount,
      startingValue: isRecurring ? startingValue : undefined,
      growthRate,
      startDate,
      endDate: isRecurring ? endDate : undefined,
      frequency: isRecurring ? frequency : undefined,
      enabled: initial?.enabled ?? true,
    });
  };

  useEffect(() => {
    onRegisterSubmit?.(handleSubmit);
    return () => onRegisterSubmit?.(null);
  }, [onRegisterSubmit, handleSubmit]);

  return (
    <div className="ps-scenario-form">
      <h3 className="ps-form-title">
        {isEditing ? 'Edit Cash Flow' : 'New Cash Flow'}
      </h3>

      {/* Type selector */}
      {!isEditing && (
        <div className="ps-field">
          <label className="ps-label">Type</label>
          <div className="ps-type-selector">
            <button
              className={`ps-type-btn ps-type-btn--inflow ${type === 'one-off' ? 'ps-type-btn--active' : ''}`}
              onClick={() => setType('one-off')}
            >
              🎁 One-off
            </button>
            <button
              className={`ps-type-btn ps-type-btn--inflow ${type === 'recurring-deposit' ? 'ps-type-btn--active' : ''}`}
              onClick={() => setType('recurring-deposit')}
            >
              📥 Deposit
            </button>
            <button
              className={`ps-type-btn ps-type-btn--outflow ${type === 'recurring-withdrawal' ? 'ps-type-btn--active' : ''}`}
              onClick={() => setType('recurring-withdrawal')}
            >
              📤 Withdrawal
            </button>
          </div>
        </div>
      )}

      {/* Label */}
      <div className="ps-field">
        <label className="ps-label">Label</label>
        <input
          type="text"
          className="ps-text-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Inheritance, Pension, Salary..."
          aria-label="Cash flow label"
        />
      </div>

      {/* Starting Value / Lump Withdrawal (recurring only, right below label) */}
      {isRecurring && (
        <div className="ps-field">
          <label className="ps-label">
            {type === 'recurring-withdrawal' ? 'Lump Withdrawal' : 'Starting Value'}
          </label>
          <CurrencyInput
            value={startingValue}
            onChange={setStartingValue}
            symbol={currencySymbol}
            ariaLabel={type === 'recurring-withdrawal' ? 'Lump withdrawal amount' : 'Starting value amount'}
          />
        </div>
      )}

      {/* Amount */}
      <div className="ps-field">
        <label className="ps-label">
          Amount{isRecurring ? ` (${frequency === 'monthly' ? 'per month' : 'per year'})` : ''}
        </label>
        <CurrencyInput
          value={amount}
          onChange={setAmount}
          symbol={currencySymbol}
          ariaLabel="Cash flow amount"
        />
      </div>

      {isRecurring && (
        <div className="ps-field">
          <label className="ps-label">Frequency</label>
          <div className="ps-toggle">
            <button
              className={`ps-toggle-btn ${frequency === 'monthly' ? 'ps-toggle-btn--active' : ''}`}
              onClick={() => setFrequency('monthly')}
            >
              Monthly
            </button>
            <button
              className={`ps-toggle-btn ${frequency === 'annually' ? 'ps-toggle-btn--active' : ''}`}
              onClick={() => setFrequency('annually')}
            >
              Annually
            </button>
          </div>
        </div>
      )}

      {/* Date(s) */}
      <div className="ps-field">
        <label className="ps-label">{isRecurring ? 'Start Date' : 'Date'}</label>
        <MonthInput
          value={startDate}
          onChange={setStartDate}
          ariaLabel="Start date"
        />
      </div>

      {isRecurring && (
        <div className="ps-field">
          <label className="ps-label">End Date</label>
          <MonthInput
            value={endDate}
            onChange={setEndDate}
            ariaLabel="End date"
          />
        </div>
      )}

      {/* Growth Rate */}
      <div className="ps-field">
        <label className="ps-label">Annual Growth Rate</label>
        <NumericInput
          value={growthRate}
          onChange={setGrowthRate}
          suffix="%"
          ariaLabel="Annual growth rate"
          min={0}
          max={50}
        />
      </div>

      {/* Actions */}
      <div className="ps-form-actions">
        <button className="ps-btn ps-btn--secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="ps-btn ps-btn--primary" onClick={handleSubmit}>
          {isEditing ? 'Save Changes' : 'Add Cash Flow'}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──

export function PortfolioSimulatorPage() {
  const { currency } = useCurrency();
  const { user } = useAuth();

  // ── Persisted working state ──
  const [simulationEnd, setSimulationEnd] = usePersistedState<string>(
    'vf-ps-sim-end',
    () => addMonths(currentMonth(), getDefaultSimulationYears() * 12),
  );
  const [cashFlows, setCashFlows] = usePersistedState<CashFlow[]>('vf-ps-cash-flows', []);

  // ── Persisted scenario management ──
  const [savedScenarios, setSavedScenarios] = usePersistedState<SavedScenario[]>('vf-ps-scenarios', []);
  const [activeScenarioId, setActiveScenarioId] = usePersistedState<string | null>('vf-ps-active-id', null);

  // ── UI state (not persisted) ──
  const [cashFlowFilter, setCashFlowFilter] = useState<'all' | 'deposits' | 'withdrawals'>('all');
  const [volatility] = useState(12);
  const numPaths = 500;
  const [showForm, setShowForm] = useState(false);
  const [editingCashFlow, setEditingCashFlow] = useState<CashFlow | null>(null);
  const [isCashFlowFormDirty, setIsCashFlowFormDirty] = useState(false);
  const submitCashFlowFormRef = useRef<(() => void) | null>(null);
  const pendingSwitchRef = useRef<string | null>(null);
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);
  const [horizonMode, setHorizonMode] = usePersistedState<'date' | 'years'>('vf-ps-horizon-mode', 'years');
  const [tableOpen, setTableOpen] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [scenarioSyncing, setScenarioSyncing] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');

  // ── Derived ──
  const activeScenario = savedScenarios.find((s) => s.id === activeScenarioId) ?? null;

  const isDirty = useMemo(() => {
    if (!activeScenario) return cashFlows.length > 0;
    return (
      activeScenario.simulationEnd !== simulationEnd ||
      JSON.stringify(activeScenario.cashFlows) !== JSON.stringify(cashFlows)
    );
  }, [activeScenario, simulationEnd, cashFlows]);

  // ── Firestore sync ──
  // Load scenarios from Firestore when user logs in
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setScenarioSyncing(true);
    loadScenarios(user.uid)
      .then((remote) => {
        if (cancelled) return;
        if (remote.length > 0) {
          setSavedScenarios(remote);
        }
      })
      .catch((err) => console.error('[scenarios] fetch failed:', err))
      .finally(() => { if (!cancelled) setScenarioSyncing(false); });
    return () => { cancelled = true; };
  }, [user, setSavedScenarios]);

  // ── Simulation ──
  const result: SimulationResult | null = useMemo(() => {
    if (cashFlows.length === 0) return null;
    return runSimulation({
      startingBalance: 0,
      cashFlows,
      volatility,
      numPaths,
      endOverride: simulationEnd,
    });
  }, [cashFlows, volatility, numPaths, simulationEnd]);

  // ── Scenario handlers ──
  const handleSaveAs = useCallback(
    (name: string) => {
      if (!user) { setShowLoginModal(true); return; }
      const newScenario: SavedScenario = {
        id: generateId(),
        name,
        startingBalance: 0,
        simulationEnd,
        cashFlows: [...cashFlows],
      };
      setSavedScenarios((prev) => [...prev, newScenario]);
      setActiveScenarioId(newScenario.id);
      saveScenario(user.uid, newScenario).catch((e) => console.error('[scenarios] save-as failed:', e));
    },
    [user, simulationEnd, cashFlows, setSavedScenarios, setActiveScenarioId],
  );

  const handleSave = useCallback(() => {
    if (!activeScenarioId) return;
    if (!user) { setShowLoginModal(true); return; }
    const updated: SavedScenario = {
      id: activeScenarioId,
      name: activeScenario?.name ?? 'Scenario',
      startingBalance: 0,
      simulationEnd,
      cashFlows: [...cashFlows],
    };
    setSavedScenarios((prev) =>
      prev.map((s) => (s.id === activeScenarioId ? updated : s)),
    );
    saveScenario(user.uid, updated).catch((e) => console.error('[scenarios] save failed:', e));
  }, [user, activeScenarioId, activeScenario, simulationEnd, cashFlows, setSavedScenarios]);

  const handleLoadScenario = useCallback(
    (id: string) => {
      const scenario = savedScenarios.find((s) => s.id === id);
      if (!scenario) return;
      setActiveScenarioId(id);
      setSimulationEnd(scenario.simulationEnd);
      setCashFlows(scenario.cashFlows);
    },
    [savedScenarios, setActiveScenarioId, setSimulationEnd, setCashFlows],
  );

  const handleNewScenario = useCallback(() => {
    setActiveScenarioId(null);
    setSimulationEnd(addMonths(currentMonth(), getDefaultSimulationYears() * 12));
    setCashFlows([]);
    setShowForm(false);
    setEditingCashFlow(null);
  }, [setActiveScenarioId, setSimulationEnd, setCashFlows]);

  const handleDeleteScenario = useCallback(
    (id: string) => {
      setSavedScenarios((prev) => prev.filter((s) => s.id !== id));
      if (user) {
        removeScenario(user.uid, id).catch((e) => console.error('[scenarios] delete failed:', e));
      }
      if (activeScenarioId === id) {
        handleNewScenario();
      }
    },
    [user, activeScenarioId, setSavedScenarios, handleNewScenario],
  );

  // ── Cash flow handlers ──
  const doSwitchTo = useCallback((id: string) => {
    const cf = cashFlows.find((c) => c.id === id);
    if (cf) {
      setIsCashFlowFormDirty(false);
      setEditingCashFlow(cf);
      setShowForm(true);
    }
  }, [cashFlows]);

  const handleAddCashFlow = useCallback(() => {
    setIsCashFlowFormDirty(false);
    setEditingCashFlow(null);
    setShowForm(true);
  }, []);

  const handleEditCashFlow = useCallback(
    (id: string) => {
      if (showForm && editingCashFlow?.id === id) return;

      // If form is dirty, show the unsaved-changes dialog instead of switching
      if (showForm && isCashFlowFormDirty) {
        setPendingEditId(id);
        return;
      }

      doSwitchTo(id);
    },
    [showForm, editingCashFlow, isCashFlowFormDirty, doSwitchTo],
  );

  // Unsaved-changes dialog handlers
  const handleUnsavedSave = useCallback(() => {
    pendingSwitchRef.current = pendingEditId;
    setPendingEditId(null);
    submitCashFlowFormRef.current?.();
  }, [pendingEditId]);

  const handleUnsavedDiscard = useCallback(() => {
    const id = pendingEditId;
    setPendingEditId(null);
    if (id) doSwitchTo(id);
  }, [pendingEditId, doSwitchTo]);

  const handleUnsavedCancel = useCallback(() => {
    setPendingEditId(null);
  }, []);

  const handleDeleteCashFlow = useCallback((id: string) => {
    setCashFlows((prev) => prev.filter((c) => c.id !== id));
  }, [setCashFlows]);

  const handleToggleCashFlow = useCallback((id: string) => {
    setCashFlows((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)),
    );
  }, [setCashFlows]);

  const handleSaveCashFlow = useCallback(
    (cashFlow: CashFlow) => {
      if (editingCashFlow) {
        setCashFlows((prev) =>
          prev.map((c) => (c.id === cashFlow.id ? cashFlow : c)),
        );
      } else {
        setCashFlows((prev) => [...prev, cashFlow]);
      }
      setIsCashFlowFormDirty(false);

      // If there's a pending switch from the unsaved-changes dialog, open that item
      const switchId = pendingSwitchRef.current;
      if (switchId) {
        pendingSwitchRef.current = null;
        const cf = cashFlows.find((c) => c.id === switchId);
        if (cf) {
          setEditingCashFlow(cf);
          return; // Keep form open with new item
        }
      }

      setShowForm(false);
      setEditingCashFlow(null);
    },
    [editingCashFlow, setCashFlows, cashFlows],
  );

  const handleCancelForm = useCallback(() => {
    setIsCashFlowFormDirty(false);
    setShowForm(false);
    setEditingCashFlow(null);
  }, []);

  return (
    <div className="ps-page">
      {/* ── Page Header ── */}
      <div className="page-header">
        <h1 className="page-title">Portfolio Simulator</h1>
        <p className="page-subtitle">
          Simulate your financial future with Monte Carlo analysis.
        </p>
      </div>

      <div className="ps-grid">
        {/* ════════ LEFT COLUMN ════════ */}
        <div className="ps-left">
          {/* ── Scenario Manager ── */}
          <div className="ps-card ps-scn-card">
            <div className="ps-scn-header">
              <h2 className="ps-card-title">📋 Scenario</h2>
              {activeScenario && !isDirty && (
                <span className="ps-scn-badge ps-scn-badge--saved">Saved</span>
              )}
              {isDirty && (
                <span className="ps-scn-badge ps-scn-badge--dirty">Unsaved</span>
              )}
            </div>

            {savedScenarios.length > 0 && (
              <select
                className="ps-scn-select"
                value={activeScenarioId ?? ''}
                onChange={(e) =>
                  e.target.value
                    ? handleLoadScenario(e.target.value)
                    : handleNewScenario()
                }
              >
                <option value="">— New scenario —</option>
                {savedScenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            {/* Save As inline row */}
            {showSaveAs ? (
              <div className="ps-scn-save-row">
                <input
                  className="ps-text-input"
                  placeholder="Scenario name…"
                  value={saveAsName}
                  onChange={(e) => setSaveAsName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && saveAsName.trim()) {
                      handleSaveAs(saveAsName.trim());
                      setShowSaveAs(false);
                    }
                    if (e.key === 'Escape') setShowSaveAs(false);
                  }}
                  autoFocus
                />
                <button
                  className="ps-btn ps-btn--primary"
                  disabled={!saveAsName.trim()}
                  onClick={() => {
                    handleSaveAs(saveAsName.trim());
                    setShowSaveAs(false);
                  }}
                >
                  Save
                </button>
                <button
                  className="ps-btn ps-btn--secondary"
                  onClick={() => setShowSaveAs(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="ps-scn-actions">
                {activeScenarioId && isDirty && (
                  <button className="ps-btn ps-btn--primary" onClick={handleSave}>
                    💾 Save
                  </button>
                )}
                <button
                  className="ps-btn ps-btn--secondary"
                  onClick={() => {
                    setShowSaveAs(true);
                    setSaveAsName(activeScenario?.name ? `${activeScenario.name} copy` : '');
                  }}
                >
                  Save as…
                </button>
                <button className="ps-btn ps-btn--secondary" onClick={handleNewScenario}>
                  + New
                </button>
                {activeScenarioId && (
                  <button
                    className="ps-btn ps-btn--secondary ps-btn--danger"
                    onClick={() => handleDeleteScenario(activeScenarioId)}
                  >
                    🗑️
                  </button>
                )}
              </div>
            )}

            {/* Login prompt when not signed in */}
            {!user && (
              <button
                className="ps-login-prompt"
                onClick={() => setShowLoginModal(true)}
              >
                🔒 Sign in to save scenarios to your account
              </button>
            )}
            {scenarioSyncing && (
              <div className="ps-sync-indicator">Syncing…</div>
            )}
          </div>

          {/* ── Simulation Setup ── */}
          <div className="ps-card">
            <h2 className="ps-card-title">Simulation Setup</h2>

            <div className="ps-field">
              <div className="ps-label-row">
                <label className="ps-label">Horizon</label>
                <div className="ps-toggle ps-toggle--sm">
                  <button
                    className={`ps-toggle-btn ${horizonMode === 'years' ? 'ps-toggle-btn--active' : ''}`}
                    onClick={() => setHorizonMode('years')}
                  >
                    Years
                  </button>
                  <button
                    className={`ps-toggle-btn ${horizonMode === 'date' ? 'ps-toggle-btn--active' : ''}`}
                    onClick={() => setHorizonMode('date')}
                  >
                    Date
                  </button>
                </div>
              </div>
              {horizonMode === 'years' ? (
                <NumericInput
                  value={(() => {
                    const [ey, em] = simulationEnd.split('-').map(Number);
                    const now = new Date();
                    const months = (ey * 12 + em) - (now.getFullYear() * 12 + (now.getMonth() + 1));
                    return Math.max(1, Math.round(months / 12));
                  })()}
                  onChange={(yrs) => setSimulationEnd(addMonths(currentMonth(), Math.round(yrs * 12)))}
                  suffix="years"
                  ariaLabel="Simulation horizon in years"
                  min={1}
                  max={100}
                />
              ) : (
                <MonthInput
                  value={simulationEnd}
                  onChange={setSimulationEnd}
                  ariaLabel="Simulation end date"
                />
              )}
            </div>

            <button
              className="ps-btn ps-btn--gold ps-btn--full"
              onClick={handleAddCashFlow}
            >
              + Add Cash Flow
            </button>
          </div>

          {/* Cash Flow Form */}
          {showForm && (
            <div className="ps-card ps-card--form">
              <CashFlowForm
                initial={editingCashFlow ?? undefined}
                currencySymbol={currency.symbol}
                onSave={handleSaveCashFlow}
                onCancel={handleCancelForm}
                onDirtyChange={setIsCashFlowFormDirty}
                onRegisterSubmit={(fn) => { submitCashFlowFormRef.current = fn; }}
              />
            </div>
          )}

          {/* Cash Flow List */}
          {cashFlows.length > 0 && (
            <div className="ps-card">
              <h2 className="ps-card-title">
                Cash Flows
                <span className="ps-scenario-count">{cashFlows.length}</span>
              </h2>

              {/* Filter pills */}
              <div className="ps-filter">
                {(['all', 'deposits', 'withdrawals'] as const).map((f) => (
                  <button
                    key={f}
                    className={`ps-filter-btn ${cashFlowFilter === f ? 'ps-filter-btn--active' : ''}`}
                    onClick={() => setCashFlowFilter(f)}
                  >
                    {f === 'all' ? 'All' : f === 'deposits' ? '📥 Deposits' : '📤 Withdrawals'}
                  </button>
                ))}
              </div>

              <div className="ps-scenario-list">
                {cashFlows
                  .filter((cf) => {
                    if (cashFlowFilter === 'all') return true;
                    if (cashFlowFilter === 'deposits') return cf.type !== 'recurring-withdrawal';
                    return cf.type === 'recurring-withdrawal';
                  })
                  .map((cf) => (
                    <CashFlowCard
                      key={cf.id}
                      cashFlow={cf}
                      currencyCode={currency.code}
                      onEdit={handleEditCashFlow}
                      onDelete={handleDeleteCashFlow}
                      onToggle={handleToggleCashFlow}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* ════════ RIGHT COLUMN ════════ */}
        <div className="ps-right">
          {/* Results Summary */}
          {result && (
            <div className="ps-card ps-results-card">
              <h2 className="ps-card-title">Results</h2>
              <div className="ps-results-grid">
                <div className="ps-result-item">
                  <span className="ps-result-label">Median Portfolio Value</span>
                  <span className="ps-result-value ps-result-value--cyan">
                    {formatCurrency(result.finalMedian, currency.code)}
                  </span>
                </div>
                <div className="ps-result-item">
                  <span className="ps-result-label">Optimistic (90th)</span>
                  <span className="ps-result-value ps-result-value--green">
                    {formatCurrency(result.finalP90, currency.code)}
                  </span>
                </div>
                <div className="ps-result-item">
                  <span className="ps-result-label">Conservative (10th)</span>
                  <span className="ps-result-value ps-result-value--yellow">
                    {formatCurrency(result.finalP10, currency.code)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Monte Carlo Chart */}
          {result && result.timeSteps.length > 0 && (
            <div className="ps-card ps-chart-card">
              <h2 className="ps-card-title">Monte Carlo Simulation</h2>
              <MonteCarloChart
                data={result.timeSteps}
                currencyCode={currency.code}
              />
            </div>
          )}

          {/* Timeline (collapsed by default) */}
          {cashFlows.length > 0 && (
            <TimelineView
              cashFlows={cashFlows}
              simulationEnd={simulationEnd}
              currencyCode={currency.code}
              onEdit={handleEditCashFlow}
            />
          )}

          {/* Expandable Table */}
          {result && result.timeSteps.length > 0 && (
            <div className="ps-card ps-table-card">
              <div className="ps-table-header">
                <button
                  className="ps-table-toggle"
                  onClick={() => setTableOpen((v) => !v)}
                  aria-expanded={tableOpen}
                >
                  <span>Table</span>
                  <span className={`ps-table-arrow ${tableOpen ? 'ps-table-arrow--open' : ''}`}>
                    ▼
                  </span>
                </button>
              </div>

              <div className={`ps-table-body ${tableOpen ? 'ps-table-body--open' : ''}`}>
                <div className="ps-table-scroll">
                  <table className="ps-table">
                    <thead>
                      <tr>
                        <th className="ps-th ps-th--left">Year</th>
                        <th className="ps-th ps-th--right">10th</th>
                        <th className="ps-th ps-th--right">25th</th>
                        <th className="ps-th ps-th--right">Median</th>
                        <th className="ps-th ps-th--right">75th</th>
                        <th className="ps-th ps-th--right">90th</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.timeSteps.map((ts, i) => (
                        <tr key={i} className="ps-tr">
                          <td className="ps-td ps-td--left">{ts.label}</td>
                          <td className="ps-td ps-td--right">{formatCurrency(ts.p10, currency.code)}</td>
                          <td className="ps-td ps-td--right">{formatCurrency(ts.p25, currency.code)}</td>
                          <td className="ps-td ps-td--right ps-td--accent">{formatCurrency(ts.median, currency.code)}</td>
                          <td className="ps-td ps-td--right">{formatCurrency(ts.p75, currency.code)}</td>
                          <td className="ps-td ps-td--right">{formatCurrency(ts.p90, currency.code)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!result && (
            <div className="ps-card ps-empty-card">
              <div className="ps-empty-icon">📊</div>
              <h2 className="ps-empty-title">No Simulation Yet</h2>
              <p className="ps-empty-text">
                Add some cash flows to see your Monte Carlo simulation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Unsaved Changes Dialog */}
      {pendingEditId && (
        <div className="confirm-overlay" onClick={handleUnsavedCancel}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-message">You have unsaved changes</p>
            <div className="confirm-actions">
              <button className="confirm-btn confirm-btn--cancel" onClick={handleUnsavedCancel}>
                Cancel
              </button>
              <button className="confirm-btn confirm-btn--discard" onClick={handleUnsavedDiscard}>
                Discard
              </button>
              <button className="confirm-btn confirm-btn--save" onClick={handleUnsavedSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </div>
  );
}
