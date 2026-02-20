import { useState, useMemo, useCallback, useEffect } from 'react';
import { useCurrency } from '../state/CurrencyContext';
import { formatCurrency } from '../utils/currency';
import {
  runSimulation,
  generateId,
  currentMonth,
  formatMonth,
  type Scenario,
  type ScenarioType,
  type SimulationResult,
} from '../utils/simulationEngine';
import { ScenarioCard } from '../components/portfolio/ScenarioCard';
import { MonteCarloChart } from '../components/portfolio/MonteCarloChart';
import { TimelineView } from '../components/portfolio/TimelineView';

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

// ── Scenario Form defaults ──
const DEFAULT_SCENARIOS: Record<ScenarioType, () => Omit<Scenario, 'id'>> = {
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

// ── Scenario Form ──

interface ScenarioFormProps {
  initial?: Scenario;
  currencySymbol: string;
  onSave: (scenario: Scenario) => void;
  onCancel: () => void;
}

function ScenarioForm({ initial, currencySymbol, onSave, onCancel }: ScenarioFormProps) {
  const isEditing = !!initial;
  const [type, setType] = useState<ScenarioType>(initial?.type ?? 'one-off');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [amount, setAmount] = useState(initial?.amount ?? 50000);
  const [growthRate, setGrowthRate] = useState(initial?.growthRate ?? 5);
  const [startDate, setStartDate] = useState(initial?.startDate ?? addMonths(currentMonth(), 60));
  const [endDate, setEndDate] = useState(initial?.endDate ?? addMonths(currentMonth(), 180));
  const [frequency, setFrequency] = useState<'monthly' | 'annually'>(initial?.frequency ?? 'monthly');

  // When type changes and we're not editing, apply defaults
  useEffect(() => {
    if (!isEditing) {
      const defaults = DEFAULT_SCENARIOS[type]();
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
      label: label || DEFAULT_SCENARIOS[type]().label,
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
        {isEditing ? 'Edit Scenario' : 'New Scenario'}
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
          aria-label="Scenario label"
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
          ariaLabel="Scenario amount"
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
          {isEditing ? 'Save Changes' : 'Add Scenario'}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──

export function PortfolioSimulatorPage() {
  const { currency } = useCurrency();

  // Starting conditions
  const [startingBalance, setStartingBalance] = useState(0);

  // Simulation horizon (default from settings, 30 years fallback)
  const [simulationEnd, setSimulationEnd] = useState(() => addMonths(currentMonth(), getDefaultSimulationYears() * 12));

  // Scenarios
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  // Scenario filter (UI only — does not affect simulation)
  const [scenarioFilter, setScenarioFilter] = useState<'all' | 'deposits' | 'withdrawals'>('all');

  // Simulation config
  const [volatility] = useState(12);
  const numPaths = 500;

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);

  // Table state
  const [tableOpen, setTableOpen] = useState(false);

  // Running simulation
  const result: SimulationResult | null = useMemo(() => {
    if (scenarios.length === 0 && startingBalance === 0) return null;
    return runSimulation({
      startingBalance,
      scenarios,
      volatility,
      numPaths,
      endOverride: simulationEnd,
    });
  }, [startingBalance, scenarios, volatility, numPaths, simulationEnd]);

  const handleAddScenario = useCallback(() => {
    setEditingScenario(null);
    setShowForm(true);
  }, []);

  const handleEditScenario = useCallback(
    (id: string) => {
      const s = scenarios.find((s) => s.id === id);
      if (s) {
        setEditingScenario(s);
        setShowForm(true);
      }
    },
    [scenarios],
  );

  const handleDeleteScenario = useCallback((id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleToggleScenario = useCallback((id: string) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    );
  }, []);

  const handleSaveScenario = useCallback(
    (scenario: Scenario) => {
      if (editingScenario) {
        setScenarios((prev) =>
          prev.map((s) => (s.id === scenario.id ? scenario : s)),
        );
      } else {
        setScenarios((prev) => [...prev, scenario]);
      }
      setShowForm(false);
      setEditingScenario(null);
    },
    [editingScenario],
  );

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setEditingScenario(null);
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
          {/* Starting Conditions */}
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
              onClick={handleAddScenario}
            >
              + Add Scenario
            </button>
          </div>

          {/* Scenario Form */}
          {showForm && (
            <div className="ps-card ps-card--form">
              <ScenarioForm
                initial={editingScenario ?? undefined}
                currencySymbol={currency.symbol}
                onSave={handleSaveScenario}
                onCancel={handleCancelForm}
              />
            </div>
          )}

          {/* Scenario List */}
          {scenarios.length > 0 && (
            <div className="ps-card">
              <h2 className="ps-card-title">
                Scenarios
                <span className="ps-scenario-count">{scenarios.length}</span>
              </h2>

              {/* Filter pills */}
              <div className="ps-filter">
                {(['all', 'deposits', 'withdrawals'] as const).map((f) => (
                  <button
                    key={f}
                    className={`ps-filter-btn ${scenarioFilter === f ? 'ps-filter-btn--active' : ''}`}
                    onClick={() => setScenarioFilter(f)}
                  >
                    {f === 'all' ? 'All' : f === 'deposits' ? '📥 Deposits' : '📤 Withdrawals'}
                  </button>
                ))}
              </div>

              <div className="ps-scenario-list">
                {scenarios
                  .filter((s) => {
                    if (scenarioFilter === 'all') return true;
                    if (scenarioFilter === 'deposits') return s.type !== 'recurring-withdrawal';
                    return s.type === 'recurring-withdrawal';
                  })
                  .map((s) => (
                    <ScenarioCard
                      key={s.id}
                      scenario={s}
                      currencyCode={currency.code}
                      onEdit={handleEditScenario}
                      onDelete={handleDeleteScenario}
                      onToggle={handleToggleScenario}
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
          {scenarios.length > 0 && (
            <TimelineView
              scenarios={scenarios}
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
                Add a starting balance and some scenarios to see your Monte Carlo simulation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
