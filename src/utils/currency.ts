import type { CurrencyCode, CurrencyInfo } from '../types';

export type { CurrencyInfo } from '../types';

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  GBP: { code: 'GBP', symbol: '£', label: '£ GBP' },
  USD: { code: 'USD', symbol: '$', label: '$ USD' },
  EUR: { code: 'EUR', symbol: '€', label: '€ EUR' },
};

export function formatCurrency(
  amount: number,
  currencyCode: CurrencyCode,
): string {
  const { symbol } = CURRENCIES[currencyCode];
  return `${symbol}${amount.toLocaleString('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}
