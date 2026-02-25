import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../state/CurrencyContext';
import { useCalculator } from '../state/CalculatorContext';
import { formatCurrency } from '../utils/currency';
import {
  normaliseToMonthly,
  totalExpenses,
  monthlySavings,
  savingsRate,
} from '../utils/calculations';
import { exportSavingsCalcPdf } from '../utils/exportPdf';
import { useSavedReports } from '../hooks/useSavedReports';
import { useAuthGate } from '../hooks/useAuthGate';
import { LoginModal } from '../components/LoginModal';
import { IncomeSection } from '../components/calculator/IncomeSection';
import { ExpensesSection } from '../components/calculator/ExpensesSection';
import { DonutChart, DonutLegend } from '../components/DonutChart';

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

export function CalculatorPage() {
  const { state } = useCalculator();
  const { currency } = useCurrency();
  const navigate = useNavigate();
  const [chartView, setChartView] = useState<ChartView>('expenses');
  const { addReport } = useSavedReports();
  const { gate, showLogin, onLoginSuccess, onLoginClose } = useAuthGate();
  const [reportName, setReportName] = useState('');

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

  return (
    <div className="calculator-page">
      <div className="page-header">
        <h1 className="page-title">Savings Calculator</h1>
        <p className="page-subtitle">
          Calculate your savings rate based on your monthly income and expenses.
        </p>
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
          <button
            className="thp-export-btn"
            onClick={() => {
              gate(() => {
                const name = reportName.trim() || `Savings Report – ${new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
                const pdfData = {
                  name,
                  income: state.income,
                  incomeFrequency: state.incomeFrequency,
                  monthlyIncome: monthlyIncome,
                  expenses: state.expenses.map((e) => ({ name: e.name, amount: e.amount, icon: e.icon })),
                  totalExpenses: expTotal,
                  monthlySavings: savings,
                  annualSavings: savings * 12,
                  savingsRate: rate,
                };
                const dataUrl = exportSavingsCalcPdf(pdfData, currency.symbol);
                addReport({
                  name,
                  category: 'savings-calculator',
                  dataUrl,
                  summary: `${formatCurrency(savings, currency.code)}/mo savings · ${rate}% rate`,
                });
                setReportName('');
              });
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export &amp; Save Report
          </button>
        </div>
      </div>

      {showLogin && <LoginModal onSuccess={onLoginSuccess} onClose={onLoginClose} />}
    </div>
  );
}
