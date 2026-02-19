import { formatCurrency } from '../../utils/currency';
import type { CurrencyInfo } from '../../utils/currency';

interface SavingsRateCardProps {
  monthlySavings: number;
  monthlyExpenses: number;
  rate: number;
  currency: CurrencyInfo;
}

export function SavingsRateCard({
  monthlySavings,
  monthlyExpenses,
  rate,
  currency,
}: SavingsRateCardProps) {
  return (
    <div className="savings-rate-card">
      <h2 className="savings-rate-heading">Savings Rate:</h2>
      <div className="savings-amount">
        {formatCurrency(monthlySavings, currency.code)}
      </div>
      <p className="savings-description">
        You're saving <strong>{formatCurrency(monthlySavings, currency.code)}</strong> per month.
      </p>
      <button className="calculate-btn">Calculate Savings</button>

      <div className="savings-stats-row">
        <div className="stat-item stat-item--savings">
          <span className="stat-icon">💰</span>
          <span className="stat-label">Savings</span>
          <span className="stat-value">
            {formatCurrency(monthlySavings * 12, currency.code)}
          </span>
        </div>
        <div className="stat-item stat-item--monthly-savings">
          <span className="stat-icon stat-icon--green">■</span>
          <span className="stat-label">Monthly Savings</span>
          <span className="stat-value">
            {formatCurrency(monthlySavings, currency.code)}
          </span>
        </div>
        <div className="stat-item stat-item--monthly-expenses">
          <span className="stat-icon stat-icon--blue">■</span>
          <span className="stat-label">Monthly Expenses</span>
          <span className="stat-value">
            {formatCurrency(monthlyExpenses, currency.code)}
          </span>
        </div>
      </div>
    </div>
  );
}
