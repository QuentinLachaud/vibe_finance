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
      <h2 className="savings-rate-heading">Monthly Savings</h2>
      <div className="savings-amount">
        {formatCurrency(monthlySavings, currency.code)}
      </div>
      <p className="savings-description">
        That's <strong>{formatCurrency(monthlySavings * 12, currency.code)}</strong> per year — a <strong>{rate}%</strong> savings rate.
      </p>

      <div className="savings-stats-row">
        <div className="stat-item">
          <span className="stat-icon">💰</span>
          <span className="stat-label">Annual Savings</span>
          <span className="stat-value">
            {formatCurrency(monthlySavings * 12, currency.code)}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">📊</span>
          <span className="stat-label">Savings Rate</span>
          <span className="stat-value stat-value--accent">{rate}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">🏠</span>
          <span className="stat-label">Monthly Expenses</span>
          <span className="stat-value">
            {formatCurrency(monthlyExpenses, currency.code)}
          </span>
        </div>
      </div>
    </div>
  );
}
