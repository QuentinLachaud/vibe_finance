import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../state/CurrencyContext';
import { useCalculator } from '../state/CalculatorContext';
import { useAuth } from '../state/AuthContext';
import { formatCurrency } from '../utils/currency';
import {
  normaliseToMonthly,
  totalExpenses,
  monthlySavings,
  savingsRate,
} from '../utils/calculations';
import { exportSavingsCalcPdf } from '../utils/exportPdf';
import { downloadBlobMobileSafe, downloadDataUrlMobileSafe, printHtmlReport } from '../utils/downloadFile';
import { useSavedReports } from '../hooks/useSavedReports';
import { useAuthGate } from '../hooks/useAuthGate';
import { usePersistedState } from '../hooks/usePersistedState';
import { LoginModal } from '../components/LoginModal';
import { ConfirmDialog } from '../components/calculator/ConfirmDialog';
import { TrashIcon } from '../components/Icons';
import { LoadingCoin } from '../components/LoadingCoin';
import { ReportFormatIcon, ReportFormatPicker, type ReportFormat } from '../components/ReportFormatPicker';
import { createReportHtml, escapeReportHtml } from '../utils/reportHtml';
import { IncomeSection } from '../components/calculator/IncomeSection';
import { ExpensesSection } from '../components/calculator/ExpensesSection';
import { DonutChart, DonutLegend } from '../components/DonutChart';
import { loadBudgets, saveBudget, removeBudget } from '../services/userDataService';
import type { CurrencyCode, SavedBudget } from '../types';
import { generateId } from '../utils/ids';


const CHART_COLORS = [
  '#3b82f6', // Housing – blue
  '#f59e0b', // Groceries – amber
  '#8b5cf6', // Transportation – purple
  '#ec4899', // Dining Out – pink
  '#10b981', // extra – green
  '#ef4444', // extra – red
  '#06b6d4', // extra – cyan
  '#f97316', // extra – orange
];

type ChartView = 'expenses' | 'flow';

function savingsReportData(name: string, income: number, incomeFrequency: string, monthlyIncome: number, expenses: { name: string; amount: number; icon?: string }[], total: number, savings: number, rate: number) {
  return { name, income, incomeFrequency, monthlyIncome, expenses, totalExpenses: total, monthlySavings: savings, annualSavings: savings * 12, savingsRate: rate };
}

function generateSavingsHTML(data: ReturnType<typeof savingsReportData>, currencyCode: CurrencyCode): string {
  const money = (value: number) => formatCurrency(value, currencyCode);
  const rows = data.expenses.map((expense) => `<tr><td>${escapeReportHtml(expense.name)}</td><td class="num">${money(expense.amount)}</td></tr>`).join('') || '<tr><td class="empty" colspan="2">No expenses recorded</td></tr>';
  return createReportHtml('Savings Report', `${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · ${data.name}`, `<div class="hero"><div class="metric-label">Monthly savings</div><div class="metric-value${data.monthlySavings < 0 ? ' negative' : ''}">${money(data.monthlySavings)}</div></div><section><h2>Income and Savings</h2><table><thead><tr><th>Item</th><th class="num">Amount</th></tr></thead><tbody><tr><td>Income (${escapeReportHtml(data.incomeFrequency)})</td><td class="num">${money(data.income)}</td></tr><tr><td>Normalised monthly income</td><td class="num">${money(data.monthlyIncome)}</td></tr><tr><td>Total expenses</td><td class="num negative">-${money(data.totalExpenses)}</td></tr><tr><td>Monthly savings</td><td class="num${data.monthlySavings < 0 ? ' negative' : ''}">${money(data.monthlySavings)}</td></tr><tr><td>Savings rate</td><td class="num">${data.savingsRate}%</td></tr></tbody></table></section><section><h2>Expense Breakdown</h2><table><thead><tr><th>Category</th><th class="num">Monthly amount</th></tr></thead><tbody>${rows}</tbody></table></section>`);
}

function generateSavingsCSV(data: ReturnType<typeof savingsReportData>): string {
  const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  return ['Savings Report', `Generated,${new Date().toLocaleDateString('en-GB')}`, `Report name,${quote(data.name)}`, '', 'Income and Savings', 'Item,Amount', `Income (${data.incomeFrequency}),${data.income}`, `Normalised monthly income,${data.monthlyIncome}`, `Total expenses,${data.totalExpenses}`, `Monthly savings,${data.monthlySavings}`, `Savings rate,${data.savingsRate}%`, '', 'Expense Breakdown', 'Category,Monthly amount', ...data.expenses.map((expense) => `${quote(expense.name)},${expense.amount}`)].join('\n');
}

import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function CalculatorPage() {
  useDocumentTitle('Savings Calculator | TakeHomeCalc');
  const { state, dispatch } = useCalculator();
  const { currency } = useCurrency();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chartView, setChartView] = useState<ChartView>('expenses');
  const { addReport } = useSavedReports();
  const { gate, showLogin, onLoginSuccess, onLoginClose } = useAuthGate();
  const [reportName, setReportName] = useState('');
  const [showReportPicker, setShowReportPicker] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  // ── Saved budgets (localStorage + Firestore) ──
  const [budgets, setBudgets] = usePersistedState<SavedBudget[]>('vf-saved-budgets', []);
  const [activeBudgetId, setActiveBudgetId] = usePersistedState<string | null>('vf-active-budget', null);
  const [budgetName, setBudgetName] = useState('');
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowBudgetDropdown(false);
      }
    };
    if (showBudgetDropdown) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showBudgetDropdown]);

  // Sync budgets from Firestore on login
  useEffect(() => {
    if (!user) return;
    loadBudgets(user.uid).then((remote) => {
      if (remote.length > 0) {
        setBudgets((local) => {
          const byId = new Map(local.map((b) => [b.id, b]));
          for (const rb of remote) {
            const existing = byId.get(rb.id);
            if (!existing || rb.updatedAt > existing.updatedAt) {
              byId.set(rb.id, rb);
            }
          }
          return Array.from(byId.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        });
      }
    }).catch(console.error);
  }, [user, setBudgets]);

  const handleSaveBudget = useCallback(() => {
    const name = budgetName.trim() || `Budget ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    const now = new Date().toISOString();
    const budget: SavedBudget = {
      id: generateId(),
      name,
      income: state.income,
      incomeFrequency: state.incomeFrequency,
      expenses: state.expenses.map((e) => ({ id: e.id, name: e.name, amount: e.amount, icon: e.icon })),
      createdAt: now,
      updatedAt: now,
    };
    setBudgets((prev) => [budget, ...prev]);
    setActiveBudgetId(budget.id);
    setBudgetName('');
    if (user) saveBudget(user.uid, budget).catch(console.error);
  }, [budgetName, state, setBudgets, setActiveBudgetId, user]);

  const handleUpdateBudget = useCallback(() => {
    if (!activeBudgetId) return;
    const now = new Date().toISOString();
    setBudgets((prev) => prev.map((b) => b.id === activeBudgetId ? {
      ...b,
      income: state.income,
      incomeFrequency: state.incomeFrequency,
      expenses: state.expenses.map((e) => ({ id: e.id, name: e.name, amount: e.amount, icon: e.icon })),
      updatedAt: now,
    } : b));
    if (user) {
      const budget = budgets.find((b) => b.id === activeBudgetId);
      if (budget) {
        saveBudget(user.uid, {
          ...budget,
          income: state.income,
          incomeFrequency: state.incomeFrequency,
          expenses: state.expenses.map((e) => ({ id: e.id, name: e.name, amount: e.amount, icon: e.icon })),
          updatedAt: new Date().toISOString(),
        }).catch(console.error);
      }
    }
  }, [activeBudgetId, state, setBudgets, budgets, user]);

  const handleLoadBudget = useCallback((budget: SavedBudget) => {
    dispatch({
      type: 'LOAD_STATE',
      payload: {
        income: budget.income,
        incomeFrequency: budget.incomeFrequency,
        expenses: budget.expenses,
      },
    });
    setActiveBudgetId(budget.id);
    setShowBudgetDropdown(false);
  }, [dispatch, setActiveBudgetId]);

  const handleDeleteBudget = useCallback((id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    if (activeBudgetId === id) setActiveBudgetId(null);
    if (user) removeBudget(user.uid, id).catch(console.error);
    setShowDeleteConfirm(null);
  }, [setBudgets, activeBudgetId, setActiveBudgetId, user]);

  const activeBudget = budgets.find((b) => b.id === activeBudgetId) ?? null;

  const monthlyIncome = normaliseToMonthly(state.income, state.incomeFrequency);
  const expTotal = totalExpenses(state.expenses);
  const savings = monthlySavings(monthlyIncome, state.expenses);
  const rate = savingsRate(monthlyIncome, state.expenses);

  // ── Expense breakdown donut ──
  const expenseSegments = state.expenses.map((exp, i) => ({
    label: exp.name,
    value: exp.amount,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const savingsColor = '#22d3ee';
  const expenseChartSegments =
    savings > 0
      ? [...expenseSegments, { label: 'Savings', value: savings, color: savingsColor }]
      : expenseSegments;

  const expenseLegend = expenseChartSegments.map((seg) => ({
    label: seg.label,
    value: formatCurrency(seg.value, currency.code),
    color: seg.color,
  }));

  // ── Income vs Outflow donut ──
  const flowSegments = [
    ...(savings > 0 ? [{ label: 'Savings', value: savings, color: '#22d3ee' }] : []),
    ...(expTotal > 0 ? [{ label: 'Expenses', value: expTotal, color: '#ef4444' }] : []),
  ];

  const flowLegend = flowSegments.map((seg) => ({
    label: seg.label,
    value: formatCurrency(seg.value, currency.code),
    color: seg.color,
  }));

  const isExpenseView = chartView === 'expenses';
  const activeSegments = isExpenseView ? expenseChartSegments : flowSegments;
  const activeLegend = isExpenseView ? expenseLegend : flowLegend;
  const centerVal = isExpenseView
    ? formatCurrency(expTotal, currency.code)
    : formatCurrency(monthlyIncome, currency.code);
  const centerLbl = isExpenseView ? 'Total Expenses' : 'Monthly Income';

  const handleGenerateReport = useCallback((format: ReportFormat) => {
    setGeneratingReport(true);
    setShowReportPicker(false);
    try {
      const name = reportName.trim() || activeBudget?.name || `Savings Report – ${new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
      const report = savingsReportData(name, state.income, state.incomeFrequency, monthlyIncome, state.expenses.map((expense) => ({ name: expense.name, amount: expense.amount, icon: expense.icon })), expTotal, savings, rate);
      const timestamp = new Date().toISOString().slice(0, 10);
      if (format === 'html') downloadBlobMobileSafe(new Blob([generateSavingsHTML(report, currency.code)], { type: 'text/html' }), `savings-report-${timestamp}.html`);
      else if (format === 'pdf') printHtmlReport(generateSavingsHTML(report, currency.code));
      else if (format === 'csv') downloadBlobMobileSafe(new Blob([generateSavingsCSV(report)], { type: 'text/csv' }), `savings-report-${timestamp}.csv`);
      else {
        const dataUrl = exportSavingsCalcPdf(report, currency.symbol, true);
        downloadDataUrlMobileSafe(dataUrl, `savings-report-${name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
        addReport({ name, category: 'savings-calculator', dataUrl, summary: `${formatCurrency(savings, currency.code)}/mo savings · ${rate}% rate` });
        setReportName('');
      }
    } catch (error) { console.error('Savings report generation failed', error); }
    setGeneratingReport(false);
  }, [activeBudget?.name, addReport, currency.code, currency.symbol, expTotal, monthlyIncome, rate, reportName, savings, state.expenses, state.income, state.incomeFrequency]);

  return (
    <div className="calculator-page">
      <div className="page-header">
        <h1 className="page-title">Savings Calculator</h1>
        <p className="page-subtitle">
          Calculate your savings rate based on your monthly income and expenses.
        </p>
      </div>

      {/* ── Budget selector ── */}
      <div className="sc-budget-bar">
        <div className="sc-budget-selector" ref={dropdownRef}>
          <button
            className="sc-budget-trigger"
            onClick={() => setShowBudgetDropdown(!showBudgetDropdown)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <span className="sc-budget-trigger-text">
              {activeBudget ? activeBudget.name : 'Unsaved budget'}
            </span>
            <svg className="sc-budget-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>

          {showBudgetDropdown && (
            <div className="sc-budget-dropdown">
              {budgets.length === 0 && (
                <div className="sc-budget-dropdown-empty">No saved budgets yet</div>
              )}
              {budgets.map((b) => (
                <div
                  key={b.id}
                  className={`sc-budget-dropdown-item${b.id === activeBudgetId ? ' sc-budget-dropdown-item--active' : ''}`}
                >
                  <button
                    className="sc-budget-dropdown-load"
                    onClick={() => handleLoadBudget(b)}
                  >
                    <span className="sc-budget-dropdown-name">{b.name}</span>
                    <span className="sc-budget-dropdown-date">
                      {new Date(b.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </button>
                  <button
                    className="sc-budget-dropdown-del"
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(b.id); }}
                    title="Delete budget"
                  >
                    <TrashIcon size={13} />
                  </button>
                </div>
              ))}
              <div className="sc-budget-dropdown-divider" />
              <div className="sc-budget-save-row">
                <input
                  type="text"
                  className="sc-budget-save-input"
                  placeholder="Budget name..."
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { handleSaveBudget(); setShowBudgetDropdown(false); } }}
                />
                <button
                  className="sc-budget-save-btn"
                  onClick={() => { handleSaveBudget(); setShowBudgetDropdown(false); }}
                >
                  Save New
                </button>
              </div>
            </div>
          )}
        </div>

        {activeBudget && (
          <button className="sc-budget-update-btn" onClick={handleUpdateBudget}>
            Update "{activeBudget.name}"
          </button>
        )}
      </div>

      <div className="calculator-grid">
        {/* Left column – inputs */}
        <div className="calculator-left">
          <IncomeSection />
          <ExpensesSection />
        </div>

        {/* Right column – donut & summary */}
        <div className="calculator-right">
          {/* Toggle between expense breakdown and income vs outflow */}
          <div className="sc-chart-toggle">
            <button
              className={`sc-chart-toggle-btn${isExpenseView ? ' sc-chart-toggle-btn--active' : ''}`}
              onClick={() => setChartView('expenses')}
            >
              By Category
            </button>
            <button
              className={`sc-chart-toggle-btn${!isExpenseView ? ' sc-chart-toggle-btn--active' : ''}`}
              onClick={() => setChartView('flow')}
            >
              Income vs Outflow
            </button>
          </div>

          <DonutChart
            segments={activeSegments}
            centerValue={centerVal}
            centerLabel={centerLbl}
            size={240}
          />

          <DonutLegend items={activeLegend} />

          {/* Compact summary strip */}
          <div className="sc-summary">
            <div className="sc-summary-item">
              <span className="sc-summary-val sc-summary-val--accent">{rate}%</span>
              <span className="sc-summary-lbl">Savings Rate</span>
            </div>
            <div className="sc-summary-divider" />
            <div className="sc-summary-item">
              <span className="sc-summary-val">{formatCurrency(savings, currency.code)}</span>
              <span className="sc-summary-lbl">Monthly Savings</span>
            </div>
            <div className="sc-summary-divider" />
            <div className="sc-summary-item">
              <span className="sc-summary-val">{formatCurrency(savings * 12, currency.code)}</span>
              <span className="sc-summary-lbl">Annual Savings</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA: bridge to compound interest calculator */}
      {savings > 0 && (
        <div className="savings-invest-cta">
          <button
            className="thp-cta"
            onClick={() => {
              localStorage.setItem(
                'vf-compound-interest',
                JSON.stringify({
                  initialInvestment: 0,
                  recurringInvestment: Math.round(savings),
                  recurringFrequency: 'monthly',
                  mode: 'deposit',
                  annualGrowthRate: 6,
                  annualDepositIncrease: 2,
                  years: 30,
                }),
              );
              navigate('/compound-interest');
            }}
          >
            See how you could invest {formatCurrency(savings, currency.code)}/mo →
          </button>
        </div>
      )}

      {/* Export / Save Report */}
      <div className="sc-export-section">
        <div className="sc-export-row">
          <input
            type="text"
            className="sc-report-name-input"
            placeholder="Report name (e.g. April Budget)"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
          />
          <button className="thp-cta" disabled={generatingReport} onClick={() => setShowReportPicker(true)}>
            <ReportFormatIcon format="document" /> Generate Savings Report
          </button>
        </div>
      </div>

      {showLogin && <LoginModal onSuccess={onLoginSuccess} onClose={onLoginClose} />}
      {showReportPicker && <ReportFormatPicker onSelect={(format) => gate(() => handleGenerateReport(format))} onCancel={() => setShowReportPicker(false)} />}
      {generatingReport && <div className="report-overlay"><LoadingCoin text="Generating report…" /></div>}

      {showDeleteConfirm && (
        <ConfirmDialog
          message="Delete this saved budget? This cannot be undone."
          onCancel={() => setShowDeleteConfirm(null)}
          onConfirm={() => handleDeleteBudget(showDeleteConfirm)}
        />
      )}
    </div>
  );
}
