import { formatCurrency } from '../../utils/currency';
import type { CurrencyInfo } from '../../utils/currency';

interface SavingsOverviewProps {
  income: number;
  expenses: number;
  savings: number;
  rate: number;
  currency: CurrencyInfo;
}

export function SavingsOverview({
  income,
  expenses,
  savings,
  rate,
  currency,
}: SavingsOverviewProps) {
  return (
    <div className="savings-overview">
      <div className="savings-overview-header">
        <div className="savings-overview-rate">
          <span className="overview-label">Savings Rate</span>
          <span className="overview-rate-value">{rate}%</span>
        </div>
        <div className="savings-overview-summary">
          <div className="summary-item">
            <span>{formatCurrency(income, currency.code)}</span>
            <span className="summary-sublabel">Income</span>
          </div>
          <div className="summary-item">
            <span>{formatCurrency(expenses, currency.code)}</span>
            <span className="summary-sublabel">Expenses</span>
          </div>
        </div>
      </div>

      <div className="savings-overview-cards">
        <div className="overview-card">
          <div className="overview-card-icon">💹</div>
          <div className="overview-card-label">Savings Rate</div>
          <div className="overview-card-value">{rate}%</div>
        </div>
        <div className="overview-card">
          <div className="overview-card-icon">💰</div>
          <div className="overview-card-label">Monthly Savings</div>
          <div className="overview-card-value">
            {formatCurrency(savings, currency.code)}
          </div>
        </div>
        <div className="overview-card">
          <div className="overview-card-icon">💼</div>
          <div className="overview-card-label">Monthly Expenses</div>
          <div className="overview-card-value">
            {formatCurrency(expenses, currency.code)}
          </div>
        </div>
      </div>
    </div>
  );
}
