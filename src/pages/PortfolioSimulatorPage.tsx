import { useState, useMemo, useCallback, useEffect } from 'react';
import { useCurrency } from '../state/CurrencyContext';
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
import { usePersistedState } from '../hooks/usePersistedState';

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

// ── Saved Scenario type ──

interface SavedScenario {
  id: string;
  name: string;
  startingBalance: number;
  simulationEnd: string;
  cashFlows: CashFlow[];
}

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

// ── Cash Flow defaults ──

const DEFAULT_CASH_FLOWS: Record<CashFlowType, () => Omit<CashFlow, 'id'>> = {
  'one-off': () => ({
    type: 'one-off',
    label: 'Inheritance',
    amount: 50000,
    growthRate: 5,
    startDate: addMonths(currentMonth(), 60),
    enabled: true,
  }),
  'recurring-deposit': () => ({
    type: 'recurring-deposit',
    label: 'Monthly Deposit',
    amount: 1500,
    growthRate: 6,
    startDate: currentMonth(),
    endDate: addMonths(currentMonth(), 180),
    frequency: 'monthly',
    enabled: true,
  }),
  'recurring-withdrawal': () => ({
    type: 'recurring-withdrawal',
    label: 'Monthly Withdrawal',
    amount: 2000,
    growthRate: 4,
    startDate: addMonths(currentMonth(), 120),
    endDate: addMonths(currentMonth(), 420),
    frequency: 'monthly',
    enabled: true,
  }),
};

// ── Cash Flow Form ──

interface CashFlowFormProps {
  initial?: CashFlow;
  currencySymbol: string;
  onSave: (cashFlow: CashFlow) => void;
  onCancel: () => void;
}

function CashFlowForm({ initial, currencySymbol, onSave, onCancel }: CashFlowFormProps) {
  const isEditing = !!initial;
  const [type, setType] = useState<CashFlowType>(initial?.type ?? 'one-off');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [amount, setAmount] = useState(initial?.amount ?? 50000);
  const [growthRate, setGrowthRate] = useState(initial?.growthRate ?? 5);
  const [startDate, setStartDate] = useState(initial?.startDate ?? addMonths(currentMonth(), 60));
  const [endDate, setEndDate] = useState(initial?.endDate ?? addMonths(currentMonth(), 180));
  const [frequency, setFrequency] = useState<'monthly' | 'annually'>(initial?.frequency ?? 'monthly');

  // When type changes and we're not editing, apply defaults
  useEffect(() => {
    if (!isEditing) {
      const defaults = DEFAULT_CASH_FLOWS[type]();
      setLabel(defaults.label);
      setAmount(defaults.amount);
      setGrowthRate(defaults.growthRate);
      setStartDate(defaults.startDate);
      if (defaults.endDate) setEndDate(defaults.endDate);
      if (defaults.frequency) setFrequency(defaults.frequency);
    }
  }, [type, isEditing]);

  const isRecurring = type !== 'one-off';

  const handleSubmit = () => {
    onSave({
      id: initial?.id ?? generateId(),
      type,
      label: label || DEFAULT_CASH_FLOWS[type]().label,
      amount,
      growthRate,
      startDate,
      endDate: isRecurring ? endDate : undefined,
      frequency: isRecurring ? frequency : undefined,
      enabled: initial?.enabled ?? true,
    });
  };

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

      {/* Frequency (recurring only) */}
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

  // ── Persisted working state ──
  const [startingBalance, setStartingBalance] = usePersistedState<number>('vf-ps-balance', 0);
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
  const [tableOpen, setTableOpen] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');

  // ── Derived ──
  const activeScenario = savedScenarios.find((s) => s.id === activeScenarioId) ?? null;

  const isDirty = useMemo(() => {
    if (!activeScenario) return cashFlows.length > 0 || startingBalance > 0;
    return (
      activeScenario.startingBalance !== startingBalance ||
      activeScenario.simulationEnd !== simulationEnd ||
      JSON.stringify(activeScenario.cashFlows) !== JSON.stringify(cashFlows)
    );
  }, [activeScenario, startingBalance, simulationEnd, cashFlows]);

  // ── Simulation ──
  const result: SimulationResult | null = useMemo(() => {
    if (cashFlows.length === 0 && startingBalance === 0) return null;
    return runSimulation({
      startingBalance,
      cashFlows,
      volatility,
      numPaths,
      endOverride: simulationEnd,
    });
  }, [startingBalance, cashFlows, volatility, numPaths, simulationEnd]);

  // ── Scenario handlers ──
  const handleSaveAs = useCallback(
    (name: string) => {
      const newScenario: SavedScenario = {
        id: generateId(),
        name,
        startingBalance,
        simulationEnd,
        cashFlows: [...cashFlows],
      };
      setSavedScenarios((prev) => [...prev, newScenario]);
      setActiveScenarioId(newScenario.id);
    },
    [startingBalance, simulationEnd, cashFlows, setSavedScenarios, setActiveScenarioId],
  );

  const handleSave = useCallback(() => {
    if (!activeScenarioId) return;
    setSavedScenarios((prev) =>
      prev.map((s) =>
        s.id === activeScenarioId
          ? { ...s, startingBalance, simulationEnd, cashFlows: [...cashFlows] }
          : s,
      ),
    );
  }, [activeScenarioId, startingBalance, simulationEnd, cashFlows, setSavedScenarios]);

  const handleLoadScenario = useCallback(
    (id: string) => {
      const scenario = savedScenarios.find((s) => s.id === id);
      if (!scenario) return;
      setActiveScenarioId(id);
      setStartingBalance(scenario.startingBalance);
      setSimulationEnd(scenario.simulationEnd);
      setCashFlows(scenario.cashFlows);
    },
    [savedScenarios, setActiveScenarioId, setStartingBalance, setSimulationEnd, setCashFlows],
  );

  const handleNewScenario = useCallback(() => {
    setActiveScenarioId(null);
    setStartingBalance(0);
    setSimulationEnd(addMonths(currentMonth(), getDefaultSimulationYears() * 12));
    setCashFlows([]);
    setShowForm(false);
    setEditingCashFlow(null);
  }, [setActiveScenarioId, setStartingBalance, setSimulationEnd, setCashFlows]);

  const handleDeleteScenario = useCallback(
    (id: string) => {
      setSavedScenarios((prev) => prev.filter((s) => s.id !== id));
      if (activeScenarioId === id) {
        handleNewScenario();
      }
    },
    [activeScenarioId, setSavedScenarios, handleNewScenario],
  );

  // ── Cash flow handlers ──
  const handleAddCashFlow = useCallback(() => {
    setEditingCashFlow(null);
    setShowForm(true);
  }, []);

  const handleEditCashFlow = useCallback(
    (id: string) => {
      const cf = cashFlows.find((c) => c.id === id);
      if (cf) {
        setEditingCashFlow(cf);
        setShowForm(true);
      }
    },
    [cashFlows],
  );

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
      setShowForm(false);
      setEditingCashFlow(null);
    },
    [editingCashFlow, setCashFlows],
  );

  const handleCancelForm = useCallback(() => {
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
          </div>

          {/* ── Starting Conditions ── */}
          <div className="ps-card">
            <h2 className="ps-card-title">Starting Conditions</h2>

            <div className="ps-field">
              <label className="ps-label">Starting Portfolio</label>
              <CurrencyInput
                value={startingBalance}
                onChange={setStartingBalance}
                symbol={currency.symbol}
                ariaLabel="Starting portfolio balance"
              />
            </div>

            <div className="ps-field">
              <label className="ps-label">Simulation Horizon</label>
              <MonthInput
                value={simulationEnd}
                onChange={setSimulationEnd}
                ariaLabel="Simulation end date"
              />
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
                Add a starting balance and some cash flows to see your Monte Carlo simulation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
