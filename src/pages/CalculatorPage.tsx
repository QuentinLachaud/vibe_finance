import { useCurrency } from '../state/CurrencyContext';
import { useCalculator } from '../state/CalculatorContext';
import { formatCurrency } from '../utils/currency';
import {
  normaliseToMonthly,
  totalExpenses,
  monthlySavings,
  savingsRate,
} from '../utils/calculations';
import { IncomeSection } from '../components/calculator/IncomeSection';
import { ExpensesSection } from '../components/calculator/ExpensesSection';
import { DonutChart, DonutLegend } from '../components/DonutChart';
import { SavingsRateCard } from '../components/calculator/SavingsRateCard';
import { SavingsOverview } from '../components/calculator/SavingsOverview';
// PageSubNav removed – tabs are only in the top header ribbon

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

export function CalculatorPage() {
  const { state } = useCalculator();
  const { currency } = useCurrency();

  const monthlyIncome = normaliseToMonthly(
    state.income,
    state.incomeFrequency,
  );
  const expTotal = totalExpenses(state.expenses);
  const savings = monthlySavings(monthlyIncome, state.expenses);
  const rate = savingsRate(monthlyIncome, state.expenses);

  // Chart segments
  const expenseSegments = state.expenses.map((exp, i) => ({
    label: exp.name,
    value: exp.amount,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  // Add savings slice
  const savingsColor = '#22d3ee'; // cyan
  const chartSegments =
    savings > 0
      ? [...expenseSegments, { label: 'Savings', value: savings, color: savingsColor }]
      : expenseSegments;

  const legendItems = chartSegments.map((seg) => ({
    label: seg.label,
    value: formatCurrency(seg.value, currency.code),
    color: seg.color,
  }));

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

        {/* Right column – chart & legend */}
        <div className="calculator-right">
          <div className="chart-wrapper">
            {savings > 0 && (
              <div className="chart-savings-label">
                <span className="chart-savings-amount">
                  {formatCurrency(savings, currency.code)}
                </span>
                <span className="chart-savings-text">Savings</span>
              </div>
            )}

            <DonutChart
              segments={chartSegments}
              centerValue={formatCurrency(expTotal, currency.code)}
              centerLabel="Total Expenses"
              size={240}
            />

            {expenseSegments.length > 0 && (
              <div className="chart-housing-label">
                <span>{formatCurrency(state.expenses[0]?.amount ?? 0, currency.code)}</span>
                <span>{state.expenses[0]?.name ?? ''}</span>
              </div>
            )}
          </div>

          <DonutLegend items={legendItems} />
        </div>
      </div>

      {/* Bottom section: Savings summary */}
      <div className="savings-section">
        <SavingsRateCard
          monthlySavings={savings}
          monthlyExpenses={expTotal}
          rate={rate}
          currency={currency}
        />

        <SavingsOverview
          income={monthlyIncome}
          expenses={expTotal}
          savings={savings}
          rate={rate}
          currency={currency}
        />
      </div>
    </div>
  );
}
