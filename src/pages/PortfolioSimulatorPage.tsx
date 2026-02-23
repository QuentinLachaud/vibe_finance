import { useState, useMemo, useCallback, useEffect, useRef, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { LoadingCoin } from '../components/LoadingCoin';
import { ConfirmDialog } from '../components/calculator/ConfirmDialog';
import { TrashIcon, EditIcon } from '../components/Icons';
import { usePersistedState } from '../hooks/usePersistedState';
import { useAuthGate } from '../hooks/useAuthGate';
import { loadScenarios, saveScenario, removeScenario } from '../services/userDataService';
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
  return 35;
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
    if (!isNaN(parsed)) {
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
  savedLabels: string[];
  onSave: (cashFlow: CashFlow) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterSubmit?: (submitFn: (() => void) | null) => void;
  onLabelSaved?: (label: string) => void;
  onLabelDeleted?: (label: string) => void;
}

function CashFlowForm({ initial, currencySymbol, savedLabels, onSave, onCancel, onDirtyChange, onRegisterSubmit, onLabelSaved, onLabelDeleted }: CashFlowFormProps) {
  const isEditing = !!initial;
  const [type, setType] = useState<CashFlowType>(initial?.type ?? 'recurring-deposit');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [startingValue, setStartingValue] = useState(initial?.startingValue ?? 0);
  const [growthRate, setGrowthRate] = useState(initial?.growthRate ?? 5);
  const [startDate, setStartDate] = useState(initial?.startDate ?? currentMonth());
  const [endDate, setEndDate] = useState(initial?.endDate ?? addMonths(currentMonth(), 180));
  const [frequency, setFrequency] = useState<'monthly' | 'annually'>(initial?.frequency ?? 'monthly');
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);

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
    // Validate: for recurring, at least one of periodic amount or lump must be set
    if (isRecurring && amount <= 0 && startingValue <= 0) {
      setShowEmptyWarning(true);
      return;
    }
    // For one-off, amount must be set
    if (!isRecurring && amount <= 0) {
      setShowEmptyWarning(true);
      return;
    }
    const finalLabel = label || (type === 'one-off' ? 'One-off' : type === 'recurring-deposit' ? 'Deposit' : 'Withdrawal');
    if (label.trim()) onLabelSaved?.(label.trim());
    onSave({
      id: initial?.id ?? generateId(),
      type,
      label: finalLabel,
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
            <button
              className={`ps-type-btn ps-type-btn--inflow ${type === 'one-off' ? 'ps-type-btn--active' : ''}`}
              onClick={() => setType('one-off')}
            >
              🎁 One-off
            </button>
          </div>
        </div>
      )}

      {/* Label */}
      <div className="ps-field">
        <label className="ps-label">Label</label>
        <div className="ps-label-combo">
          <input
            ref={labelInputRef}
            type="text"
            className="ps-text-input"
            value={label}
            onChange={(e) => { setLabel(e.target.value); setShowLabelDropdown(true); }}
            onFocus={() => setShowLabelDropdown(true)}
            onBlur={() => { setTimeout(() => setShowLabelDropdown(false), 150); }}
            placeholder="e.g. Inheritance, Pension, Salary..."
            aria-label="Cash flow label"
          />
          {showLabelDropdown && savedLabels.length > 0 && (
            <div className="ps-label-dropdown">
              {savedLabels
                .filter((l) => !label || l.toLowerCase().includes(label.toLowerCase()))
                .map((l) => (
                  <div key={l} className="ps-label-dropdown-item">
                    <button
                      className="ps-label-dropdown-pick"
                      onMouseDown={(e) => { e.preventDefault(); setLabel(l); setShowLabelDropdown(false); }}
                    >
                      {l}
                    </button>
                    <button
                      className="ps-label-dropdown-del"
                      onMouseDown={(e) => { e.preventDefault(); onLabelDeleted?.(l); }}
                      aria-label={`Remove ${l}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
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

      {/* Empty amount warning popup */}
      {showEmptyWarning && (
        <div className="confirm-overlay" onClick={() => setShowEmptyWarning(false)}>
          <div className="confirm-dialog ps-empty-warning" onClick={(e) => e.stopPropagation()}>
            <div className="ps-empty-warning-icon">⚠️</div>
            <p className="confirm-message">
              {isRecurring
                ? 'Please enter a periodic amount or a lump sum before saving.'
                : 'Please enter an amount before saving.'}
            </p>
            <div className="confirm-actions">
              <button className="confirm-btn confirm-btn--save" onClick={() => setShowEmptyWarning(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──

export function PortfolioSimulatorPage() {
  const { currency } = useCurrency();
  const { user } = useAuth();
  const navigate = useNavigate();

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
  const [showForm, setShowForm] = useState(false);
  const [editingCashFlow, setEditingCashFlow] = useState<CashFlow | null>(null);
  const [isCashFlowFormDirty, setIsCashFlowFormDirty] = useState(false);
  const submitCashFlowFormRef = useRef<(() => void) | null>(null);
  const cashFlowFormRef = useRef<HTMLDivElement>(null);
  const pendingSwitchRef = useRef<string | null>(null);
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);
  const [horizonMode, setHorizonMode] = usePersistedState<'date' | 'years'>('vf-ps-horizon-mode', 'years');
  const [tableOpen, setTableOpen] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const { gate, showLogin: showLoginModal, onLoginSuccess, onLoginClose } = useAuthGate();
  const [saveAsName, setSaveAsName] = useState('');
  const [renamingScenario, setRenamingScenario] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [savedLabels, setSavedLabels] = usePersistedState<string[]>('vf-ps-labels', []);
  const [deleteScenarioId, setDeleteScenarioId] = useState<string | null>(null);

  // ── Advanced settings (persisted) ──
  const DEFAULT_VOLATILITY = 15; // S&P 500 long-run annualised volatility ~15%
  const SIM_OPTIONS = [500, 1000, 2500, 5000, 10000] as const;
  const [volatility, setVolatility] = usePersistedState<number>('vf-ps-volatility', DEFAULT_VOLATILITY);
  const [numPaths, setNumPaths] = usePersistedState<number>('vf-ps-num-paths', 500);
  type PathDisplay = 'quartiles' | 'all' | 'both';
  const [showAllPaths, setShowAllPaths] = usePersistedState<PathDisplay>('vf-ps-show-all-paths', 'quartiles');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showVolatilityWarning, setShowVolatilityWarning] = useState(false);
  const [pendingVolatility, setPendingVolatility] = useState<number | null>(null);

  // ── Simulation loading state ──
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Derived ──
  const activeScenario = savedScenarios.find((s) => s.id === activeScenarioId) ?? null;

  const isDirty = useMemo(() => {
    if (!activeScenario) return cashFlows.length > 0;
    return (
      activeScenario.simulationEnd !== simulationEnd ||
      JSON.stringify(activeScenario.cashFlows) !== JSON.stringify(cashFlows)
    );
  }, [activeScenario, simulationEnd, cashFlows]);

  // ── Firestore sync (silent background merge) ──
  // Merge remote scenarios into local state without blocking UI
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadScenarios(user.uid)
      .then((remote) => {
        if (cancelled || remote.length === 0) return;
        setSavedScenarios((local) => {
          const localIds = new Set(local.map((s) => s.id));
          const merged = [...local];
          for (const r of remote) {
            if (!localIds.has(r.id)) merged.push(r);
            else {
              // overwrite local with remote version
              const idx = merged.findIndex((s) => s.id === r.id);
              if (idx !== -1) merged[idx] = r;
            }
          }
          return merged;
        });
      })
      .catch((err) => console.error('[scenarios] fetch failed:', err));
    return () => { cancelled = true; };
  }, [user, setSavedScenarios]);

  // ── Simulation (with loading spinner) ──
  const [result, setResult] = useState<SimulationResult | null>(null);
  const prevInputsRef = useRef<string>('');

  useEffect(() => {
    if (cashFlows.length === 0) {
      setResult(null);
      setIsSimulating(false);
      prevInputsRef.current = '';
      return;
    }
    const inputKey = JSON.stringify({ cashFlows, volatility, numPaths, simulationEnd, showAllPaths });
    if (inputKey === prevInputsRef.current) return;
    prevInputsRef.current = inputKey;

    setIsSimulating(true);
    // Run in next tick so the loading spinner renders
    if (simulationTimerRef.current) clearTimeout(simulationTimerRef.current);
    simulationTimerRef.current = setTimeout(() => {
      try {
        const res = runSimulation({
          startingBalance: 0,
          cashFlows,
          volatility,
          numPaths,
          endOverride: simulationEnd,
          returnAllPaths: showAllPaths === 'all' || showAllPaths === 'both',
        });
        setResult(res);
      } finally {
        setIsSimulating(false);
      }
    }, 50);

    return () => {
      if (simulationTimerRef.current) clearTimeout(simulationTimerRef.current);
    };
  }, [cashFlows, volatility, numPaths, simulationEnd, showAllPaths]);

  // ── Scenario handlers ──
  const handleSaveAs = useCallback(
    (name: string) => {
      gate(() => {
        const newScenario: SavedScenario = {
          id: generateId(),
          name,
          startingBalance: 0,
          simulationEnd,
          cashFlows: [...cashFlows],
        };
        setSavedScenarios((prev) => [...prev, newScenario]);
        setActiveScenarioId(newScenario.id);
        if (user) saveScenario(user.uid, newScenario).catch((e) => console.error('[scenarios] save-as failed:', e));
      });
    },
    [user, gate, simulationEnd, cashFlows, setSavedScenarios, setActiveScenarioId],
  );

  const handleSave = useCallback(() => {
    if (!activeScenarioId) return;
    gate(() => {
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
      if (user) saveScenario(user.uid, updated).catch((e) => console.error('[scenarios] save failed:', e));
    });
  }, [user, gate, activeScenarioId, activeScenario, simulationEnd, cashFlows, setSavedScenarios]);

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

  const handleRenameScenario = useCallback(
    (newName: string) => {
      if (!activeScenarioId || !newName.trim()) return;
      setSavedScenarios((prev) =>
        prev.map((s) => (s.id === activeScenarioId ? { ...s, name: newName.trim() } : s)),
      );
      if (user) {
        const scenario = savedScenarios.find((s) => s.id === activeScenarioId);
        if (scenario) {
          saveScenario(user.uid, { ...scenario, name: newName.trim() }).catch((e) =>
            console.error('[scenarios] rename failed:', e),
          );
        }
      }
      setRenamingScenario(false);
    },
    [user, activeScenarioId, savedScenarios, setSavedScenarios],
  );

  // ── Cash flow handlers ──
  const scrollToForm = useCallback(() => {
    setTimeout(() => {
      cashFlowFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, []);

  const doSwitchTo = useCallback((id: string) => {
    const cf = cashFlows.find((c) => c.id === id);
    if (cf) {
      setIsCashFlowFormDirty(false);
      setEditingCashFlow(cf);
      setShowForm(true);
      scrollToForm();
    }
  }, [cashFlows, scrollToForm]);

  const handleAddCashFlow = useCallback(() => {
    setIsCashFlowFormDirty(false);
    setEditingCashFlow(null);
    setShowForm(true);
    scrollToForm();
  }, [scrollToForm]);

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

            {/* Save As / Rename inline row */}
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
            ) : renamingScenario ? (
              <div className="ps-scn-save-row">
                <input
                  className="ps-text-input"
                  placeholder="New name…"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && renameValue.trim()) handleRenameScenario(renameValue);
                    if (e.key === 'Escape') setRenamingScenario(false);
                  }}
                  autoFocus
                />
                <button
                  className="ps-btn ps-btn--primary"
                  disabled={!renameValue.trim()}
                  onClick={() => handleRenameScenario(renameValue)}
                >
                  Rename
                </button>
                <button
                  className="ps-btn ps-btn--secondary"
                  onClick={() => setRenamingScenario(false)}
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
                  <>
                    <button
                      className="ps-btn ps-btn--secondary ps-btn--icon"
                      onClick={() => { setRenamingScenario(true); setRenameValue(activeScenario?.name ?? ''); }}
                      aria-label="Rename scenario"
                    >
                      <EditIcon size={14} />
                    </button>
                    <button
                      className="ps-btn ps-btn--secondary ps-btn--danger ps-btn--icon"
                      onClick={() => setDeleteScenarioId(activeScenarioId)}
                      aria-label="Delete scenario"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Login prompt when not signed in */}
            {!user && (
              <button
                className="ps-login-prompt"
                onClick={() => gate(() => {})}
              >
                🔒 Sign in to save scenarios to your account
              </button>
            )}

            {/* Generate Report CTA — shown when scenario is saved */}
            {activeScenarioId && !isDirty && (
              <button
                className="ps-btn ps-btn--gold ps-generate-report-cta"
                onClick={() => navigate('/reports')}
              >
                📊 Generate Report
              </button>
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

            {/* ── Advanced Settings ── */}
            <button
              className="ps-advanced-toggle"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              <span>⚙️ Advanced Settings</span>
              <span className={`ps-table-arrow ${showAdvanced ? 'ps-table-arrow--open' : ''}`}>▼</span>
            </button>

            {showAdvanced && (
              <div className="ps-advanced-panel">
                {/* Volatility */}
                <div className="ps-field">
                  <label className="ps-label">
                    Annual Volatility
                    <span className="ps-label-hint">S&P 500 long-run ≈ 15%</span>
                  </label>
                  <NumericInput
                    value={volatility}
                    onChange={(v) => {
                      if (v !== DEFAULT_VOLATILITY) {
                        setPendingVolatility(v);
                        setShowVolatilityWarning(true);
                      } else {
                        setVolatility(v);
                      }
                    }}
                    suffix="%"
                    ariaLabel="Annual volatility"
                    min={1}
                    max={50}
                  />
                </div>

                {/* Number of Simulations */}
                <div className="ps-field">
                  <label className="ps-label">Simulation Paths</label>
                  <div className="ps-sim-options">
                    {SIM_OPTIONS.map((n) => (
                      <button
                        key={n}
                        className={`ps-sim-option ${numPaths === n ? 'ps-sim-option--active' : ''}`}
                        onClick={() => setNumPaths(n)}
                      >
                        {n.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Path display mode */}
                <div className="ps-field">
                  <label className="ps-label">Chart Display</label>
                  <div className="ps-toggle">
                    {(['quartiles', 'all', 'both'] as const).map((mode) => (
                      <button
                        key={mode}
                        className={`ps-toggle-btn ${showAllPaths === mode ? 'ps-toggle-btn--active' : ''}`}
                        onClick={() => setShowAllPaths(mode)}
                      >
                        {mode === 'quartiles' ? 'Quartiles' : mode === 'all' ? 'All Paths' : 'Both'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button
              className="ps-btn ps-btn--gold ps-btn--full"
              onClick={handleAddCashFlow}
            >
              + Add Cash Flow
            </button>
          </div>

          {/* Cash Flow Form */}
          {showForm && (
            <div className="ps-card ps-card--form" ref={cashFlowFormRef}>
              <CashFlowForm
                initial={editingCashFlow ?? undefined}
                currencySymbol={currency.symbol}
                savedLabels={savedLabels}
                onSave={handleSaveCashFlow}
                onCancel={handleCancelForm}
                onDirtyChange={setIsCashFlowFormDirty}
                onRegisterSubmit={(fn) => { submitCashFlowFormRef.current = fn; }}
                onLabelSaved={(l) => setSavedLabels((prev) => prev.includes(l) ? prev : [...prev, l].sort())}
                onLabelDeleted={(l) => setSavedLabels((prev) => prev.filter((x) => x !== l))}
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
        <div className="ps-right" style={{ position: 'relative' }}>
          {/* Loading overlay */}
          {isSimulating && (
            <div className="ps-sim-loading-overlay">
              <LoadingCoin text="Simulating…" />
            </div>
          )}

          {/* Results Summary */}
          {result && (
            <div className="ps-card ps-results-card">
              <h2 className="ps-card-title">Results</h2>
              <div className="ps-results-grid">
                <div className="ps-result-item">
                  <span className="ps-result-label">Median (Expected)</span>
                  <span className="ps-result-value ps-result-value--cyan">
                    {formatCurrency(result.finalMedian, currency.code)}
                  </span>
                </div>
                <div className="ps-result-item">
                  <span className="ps-result-label">Optimistic (75th)</span>
                  <span className="ps-result-value ps-result-value--green">
                    {formatCurrency(result.finalP75, currency.code)}
                  </span>
                </div>
                <div className="ps-result-item">
                  <span className="ps-result-label">Pessimistic (25th)</span>
                  <span className="ps-result-value ps-result-value--yellow">
                    {formatCurrency(result.finalP25, currency.code)}
                  </span>
                </div>
                <div className="ps-result-item ps-result-item--full">
                  <span className="ps-result-label">Survival Rate</span>
                  <span className={`ps-survival-badge ${
                    result.survivalRate >= 95 ? 'ps-survival-badge--green' :
                    result.survivalRate >= 80 ? 'ps-survival-badge--yellow' :
                    'ps-survival-badge--red'
                  }`}>
                    {result.survivalRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Monte Carlo Chart */}
          {result && result.timeSteps.length > 0 && (
            <div className="ps-card ps-chart-card">
              <MonteCarloChart
                data={result.timeSteps}
                result={result}
                currencyCode={currency.code}
                showAllPaths={showAllPaths}
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

      {/* Delete Scenario Confirmation */}
      {deleteScenarioId && (
        <ConfirmDialog
          message={`Delete "${savedScenarios.find((s) => s.id === deleteScenarioId)?.name ?? 'this scenario'}"? This cannot be undone.`}
          onCancel={() => setDeleteScenarioId(null)}
          onConfirm={() => {
            handleDeleteScenario(deleteScenarioId);
            setDeleteScenarioId(null);
          }}
        />
      )}

      {/* Volatility Warning */}
      {showVolatilityWarning && (
        <div className="confirm-overlay" onClick={() => { setShowVolatilityWarning(false); setPendingVolatility(null); }}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-message" style={{ fontWeight: 600, fontSize: 15 }}>⚠️ Adjust Volatility?</p>
            <p className="confirm-detail" style={{ fontSize: 13, opacity: 0.8, marginTop: 6, lineHeight: 1.5 }}>
              Changing volatility from the default ({DEFAULT_VOLATILITY}%) will significantly affect simulation
              results. Only change this if you understand how standard deviation of returns impacts
              Monte Carlo projections.
            </p>
            <div className="confirm-actions">
              <button className="confirm-btn confirm-btn--cancel" onClick={() => { setShowVolatilityWarning(false); setPendingVolatility(null); }}>
                Cancel
              </button>
              <button className="confirm-btn confirm-btn--save" onClick={() => { if (pendingVolatility !== null) setVolatility(pendingVolatility); setShowVolatilityWarning(false); setPendingVolatility(null); }}>
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && <LoginModal onClose={onLoginClose} onSuccess={onLoginSuccess} />}
    </div>
  );
}
